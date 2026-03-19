import { PipelineSummary, ListPipelinesCommand } from "@aws-sdk/client-codepipeline";
import { getCodePipelineClient } from "../services/clients/codepipeline";

/**
 * Lists all CodePipeline pipelines in the current AWS account and region
 * @returns Promise<PipelineSummary[]> Array of pipeline summaries
 */
export default async function listCodePipelinePipelines(): Promise<PipelineSummary[]> {
  const client = getCodePipelineClient();

  const pipelines: PipelineSummary[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListPipelinesCommand({ nextToken });
    const response = await client.send(command);

    if (response.pipelines) {
      pipelines.push(...response.pipelines.filter((p) => p.name));
    }

    nextToken = response.nextToken;
  } while (nextToken);

  return pipelines;
}
