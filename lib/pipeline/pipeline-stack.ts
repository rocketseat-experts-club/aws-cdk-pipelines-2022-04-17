import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as codecommit from "aws-cdk-lib/aws-codecommit";
import { CodeBuildStep, CodePipeline, CodePipelineSource } from "aws-cdk-lib/pipelines";
import { ExpertsClubPipelineStage } from './pipeline-stage';

export class ExpertsClubPipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps ) {
    super(scope, id, props);

    const repo = new codecommit.Repository(this, 'ExpertsClubRepo', {
      repositoryName: "ExpertsClubRepo"
    });

    const pipeline = new CodePipeline(this, 'Pipeline', {
      pipelineName: 'ExpertsClubPipeline',
      synth: new CodeBuildStep("SynthStep", {
        input: CodePipelineSource.codeCommit(repo, 'master'),
        installCommands: [
          'npm install -g aws-cdk',
        ],
        commands: [
          'npm ci',
          'npm run build',
          'npx cdk synth',
        ]
      })
    });

    const deploy = new ExpertsClubPipelineStage(this, 'Deploy');
    const deployStage = pipeline.addStage(deploy);

    deployStage.addPost(
      new CodeBuildStep('TesteViwerEndpoint', {
        projectName: 'TesteViwerEndpoint',
        envFromCfnOutputs: {
          ENDPOINT_URL: deploy.hcViewerUrl
        },
        commands: [
          'curl -Ssf $ENDPOINT_URL',
        ]
      }),

      new CodeBuildStep('TesteEndpoint', {
        projectName: 'TesteEndpoint',
        envFromCfnOutputs: {
          ENDPOINT_URL: deploy.hcEndpoint
        },
        commands: [
          'curl -Ssf $ENDPOINT_URL',
          'curl -Ssf $ENDPOINT_URL/hello',
          'curl -Ssf $ENDPOINT_URL/test',
        ]
      })
    );
  }
}