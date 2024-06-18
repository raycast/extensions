import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  CodePipelineClient,
  GetPipelineStateCommand,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
} from "@aws-sdk/client-codepipeline";

export const usePipelines = () => {
  const {
    data: pipelines,
    pagination,
    revalidate,
    error,
    isLoading,
  } = useCachedPromise(
    () =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { nextToken, pipelines: pipelineSummaries } = await new CodePipelineClient({}).send(
          new ListPipelinesCommand({ nextToken: cursor, maxResults: 50 }),
        );

        const keyedPipelines = await Promise.all(
          (pipelineSummaries ?? []).map(async (p) => {
            const { pipelineExecutionSummaries: executions } = await new CodePipelineClient({}).send(
              new ListPipelineExecutionsCommand({ pipelineName: p.name }),
            );

            const { stageStates } = await new CodePipelineClient({}).send(
              new GetPipelineStateCommand({ name: p.name }),
            );
            const stages = (stageStates ?? []).map((s, i) => {
              let nextStage = undefined;
              if (i < stageStates!.length - 1) {
                nextStage = stageStates![i + 1];
              }
              return { ...s, nextStage };
            });

            return { ...p, pipelineKey: `#${page}-${p.name}`, executions, stages };
          }),
        );
        return { data: keyedPipelines, hasMore: !!nextToken, cursor: nextToken };
      },
    [],
    { execute: isReadyToFetch() },
  );

  return { pipelines, pagination, error, isLoading: (!pipelines && !error) || isLoading, revalidate };
};
