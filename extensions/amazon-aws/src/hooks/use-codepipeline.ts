import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  CodePipelineClient,
  GetPipelineStateCommand,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
} from "@aws-sdk/client-codepipeline";
import { Pipeline, PipelineStage } from "../codepipeline";

export const usePipelines = () => {
  const {
    data: pipelines,
    pagination,
    mutate,
    error,
    isLoading,
  } = useCachedPromise(
    () =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const { nextToken, pipelines: pipelineSummaries } = await new CodePipelineClient({}).send(
          new ListPipelinesCommand({ nextToken: cursor, maxResults: 50 }),
        );

        const keyedPipelines = await Promise.all(
          (pipelineSummaries ?? [])
            .filter((p) => !!p.name)
            .map(async (p) => {
              const { pipelineExecutionSummaries } = await new CodePipelineClient({}).send(
                new ListPipelineExecutionsCommand({ pipelineName: p.name }),
              );
              const executions = (pipelineExecutionSummaries ?? []).filter((e) => !!e.pipelineExecutionId);

              const { stageStates } = await new CodePipelineClient({}).send(
                new GetPipelineStateCommand({ name: p.name }),
              );
              const definedStages = (stageStates ?? []).filter((s) => !!s.stageName);
              const stages = definedStages.map((s, i) => {
                let nextStage = undefined;
                if (i < definedStages.length - 1) {
                  nextStage = definedStages[i + 1];
                }
                return { ...s, nextStage };
              }) as PipelineStage[];

              return { ...p, pipelineKey: `#${page}-${p.name}`, executions, stages };
            }),
        );
        return { data: keyedPipelines as Pipeline[], hasMore: !!nextToken, cursor: nextToken };
      },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to fetch pipelines" } },
  );

  return { pipelines, pagination, error, isLoading: (!pipelines && !error) || isLoading, mutate };
};
