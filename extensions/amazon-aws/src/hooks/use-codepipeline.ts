import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  GetPipelineStateCommand,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
} from "@aws-sdk/client-codepipeline";
import { Pipeline, PipelineStage } from "../codepipeline";
import { showToast, Toast } from "@raycast/api";
import { getCodePipelineClient } from "../services/clients/codepipeline";

export const usePipelines = () => {
  const {
    data: pipelines,
    isLoading,
    mutate,
    error,
  } = useCachedPromise(
    async () => {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Loading pipelines" });
      return await fetchPipelines(toast);
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load pipelines" } },
  );

  return { pipelines, isLoading: (!pipelines && !error) || isLoading, error, mutate };
};

export const usePipelineState = (pipelineName: string) => {
  const {
    data: stages,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (name: string) => {
      const { stageStates } = await getCodePipelineClient().send(new GetPipelineStateCommand({ name }));
      const definedStages = (stageStates ?? []).filter((s) => !!s.stageName);
      return definedStages.map((s, i) => {
        let nextStage = undefined;
        if (i < definedStages.length - 1) {
          nextStage = definedStages[i + 1];
        }
        return { ...s, nextStage };
      }) as PipelineStage[];
    },
    [pipelineName],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load pipeline state" } },
  );

  return { stages, isLoading: (!stages && !error) || isLoading, mutate };
};

export const usePipelineExecutions = (pipelineName: string) => {
  const {
    data: executions,
    error,
    isLoading,
    mutate,
  } = useCachedPromise(
    async (name: string) => {
      const { pipelineExecutionSummaries } = await getCodePipelineClient().send(
        new ListPipelineExecutionsCommand({ pipelineName: name }),
      );
      return (pipelineExecutionSummaries ?? []).filter((e) => !!e.pipelineExecutionId);
    },
    [pipelineName],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load pipeline executions" } },
  );

  return { executions, isLoading: (!executions && !error) || isLoading, mutate };
};

async function fetchPipelines(toast: Toast, maxResults = 100): Promise<Pipeline[]> {
  const allPipelines: Pipeline[] = [];
  let nextToken: string | undefined;

  do {
    const { pipelines: pipelineSummaries, nextToken: cursor } = await getCodePipelineClient().send(
      new ListPipelinesCommand({ nextToken, maxResults: Math.min(maxResults - allPipelines.length, 25) }),
    );

    const pipelines = await Promise.all(
      (pipelineSummaries ?? [])
        .filter((p) => !!p.name)
        .map(async (p) => {
          const { pipelineExecutionSummaries } = await getCodePipelineClient().send(
            new ListPipelineExecutionsCommand({ pipelineName: p.name }),
          );

          const executions = (pipelineExecutionSummaries ?? []).filter((e) => !!e.pipelineExecutionId);
          return { ...p, ...(executions.length > 0 && { latestExecution: executions[0] }) } as Pipeline;
        }),
    );

    allPipelines.push(...pipelines);
    toast.message = `${allPipelines.length} pipelines`;
    nextToken = cursor;
  } while (nextToken && allPipelines.length < maxResults);

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded pipelines";
  toast.message = `${allPipelines.length} pipelines`;
  return allPipelines;
}
