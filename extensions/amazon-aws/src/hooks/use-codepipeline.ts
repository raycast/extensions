import { useCachedPromise } from "@raycast/utils";
import { isReadyToFetch } from "../util";
import {
  CodePipelineClient,
  GetPipelineStateCommand,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
} from "@aws-sdk/client-codepipeline";
import { Pipeline, PipelineStage } from "../codepipeline";
import { showToast, Toast } from "@raycast/api";

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
      const { stageStates } = await new CodePipelineClient({}).send(new GetPipelineStateCommand({ name }));
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
      const { pipelineExecutionSummaries } = await new CodePipelineClient({}).send(
        new ListPipelineExecutionsCommand({ pipelineName: name }),
      );
      return (pipelineExecutionSummaries ?? []).filter((e) => !!e.pipelineExecutionId);
    },
    [pipelineName],
    { execute: isReadyToFetch(), failureToastOptions: { title: "❌Failed to load pipeline executions" } },
  );

  return { executions, isLoading: (!executions && !error) || isLoading, mutate };
};

const fetchPipelines = async (toast: Toast, nextToken?: string, aggregate?: Pipeline[]): Promise<Pipeline[]> => {
  const { pipelines: pipelineSummaries, nextToken: cursor } = await new CodePipelineClient({}).send(
    new ListPipelinesCommand({ nextToken, maxResults: 5 }),
  );

  const pipelines = await Promise.all(
    (pipelineSummaries ?? [])
      .filter((p) => !!p.name)
      .map(async (p) => {
        const { pipelineExecutionSummaries } = await new CodePipelineClient({}).send(
          new ListPipelineExecutionsCommand({ pipelineName: p.name }),
        );

        const executions = (pipelineExecutionSummaries ?? []).filter((e) => !!e.pipelineExecutionId);
        return { ...p, ...(executions.length > 0 && { latestExecution: executions[0] }) } as Pipeline;
      }),
  );

  const agg = [...(aggregate ?? []), ...pipelines];
  toast.message = `${agg.length} pipelines`;
  if (cursor) {
    return await fetchPipelines(toast, cursor, agg);
  }

  toast.style = Toast.Style.Success;
  toast.title = "✅ Loaded pipelines";
  toast.message = `${agg.length} pipelines`;
  return agg;
};
