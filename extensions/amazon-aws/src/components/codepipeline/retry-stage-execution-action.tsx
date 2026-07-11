import { Action, ActionPanel, captureException, Color, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import {
  CodePipelineClient,
  PipelineExecutionStatus,
  RetryStageExecutionCommand,
  RetryStageExecutionCommandInput,
  StageExecutionStatus,
  StageRetryMode,
} from "@aws-sdk/client-codepipeline";
import { getErrorMessage } from "../../util";
import { Pipeline, PipelineStage } from "../../codepipeline";
import { MutatePromise } from "@raycast/utils";
import { usePipelineState } from "../../hooks/use-codepipeline";

export const RetryStageExecutionAction = ({
  pipeline,
  visit,
  mutate,
}: {
  pipeline: Pipeline;
  mutate: MutatePromise<Pipeline[] | undefined>;
  visit: (pipeline: Pipeline) => Promise<void>;
}) => {
  const { stages, isLoading, mutate: revalidate } = usePipelineState(pipeline.name!);

  return (
    <ActionPanel.Submenu
      title="Retry Stage Execution"
      icon={Icon.BandAid}
      shortcut={{ modifiers: ["ctrl"], key: "r" }}
      isLoading={isLoading}
      onOpen={revalidate}
      filtering
    >
      {(stages ?? [])
        .filter((s) => !!s.latestExecution)
        .filter(
          (s) =>
            s.latestExecution!.status === StageExecutionStatus.Failed ||
            s.latestExecution!.status === StageExecutionStatus.Stopped,
        )
        .flatMap((s) => [
          { ...s, retryMode: StageRetryMode.ALL_ACTIONS },
          { ...s, retryMode: StageRetryMode.FAILED_ACTIONS },
        ])
        .map((s) => (
          <Action
            key={`${s.retryMode}-${pipeline.name}-${s.stageName}`}
            icon={{
              source: s.retryMode === StageRetryMode.ALL_ACTIONS ? Icon.Patch : Icon.BandAid,
              tintColor: Color.Orange,
            }}
            title={
              s.retryMode === StageRetryMode.ALL_ACTIONS
                ? `${s.stageName}: All actions`
                : `${s.stageName}: Failed actions`
            }
            onAction={async () => {
              await visit(pipeline);
              await retryStageExecution(pipeline.name!, s, mutate);
            }}
          />
        ))}
    </ActionPanel.Submenu>
  );
};

const retryStageExecution = async (
  pipelineName: string,
  stage: PipelineStage & { retryMode: StageRetryMode },
  mutate: MutatePromise<Pipeline[] | undefined>,
) => {
  await confirmAlert({
    title: "Are you sure?",
    icon: {
      source: stage.retryMode === StageRetryMode.ALL_ACTIONS ? Icon.Patch : Icon.BandAid,
      tintColor: Color.Orange,
    },
    message: `Retry ${stage.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${stage.stageName}?`,
    primaryAction: {
      title: "Retry",
      onAction: () => retry(pipelineName, stage, mutate),
    },
  });
};

const retry = async (
  pipelineName: string,
  stage: PipelineStage & { retryMode: StageRetryMode },
  mutate: MutatePromise<Pipeline[] | undefined>,
) => {
  const input: RetryStageExecutionCommandInput = {
    pipelineName,
    pipelineExecutionId: stage.latestExecution!.pipelineExecutionId,
    stageName: stage.stageName,
    retryMode: stage.retryMode,
  };

  const toast = await showToast(
    Toast.Style.Animated,
    `Retrying ${stage.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${stage.stageName}`,
  );

  mutate(new CodePipelineClient({}).send(new RetryStageExecutionCommand(input)), {
    optimisticUpdate: (pipelines) => {
      if (!pipelines) {
        return;
      }

      return pipelines?.map((p) =>
        p.name === pipelineName
          ? {
              ...p,
              ...(p.latestExecution && {
                latestExecution: {
                  ...p.latestExecution,
                  status: PipelineExecutionStatus.InProgress,
                  statusSummary: "Retried stage execution",
                },
              }),
            }
          : p,
      );
    },
    shouldRevalidateAfter: false,
  })
    .then(({ pipelineExecutionId }) => {
      toast.style = Toast.Style.Success;
      toast.title = `✅ Retried ${stage.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${stage.stageName}`;
      toast.message = `Execution ID: ${pipelineExecutionId}`;
    })
    .catch((err) => {
      captureException(err);
      toast.style = Toast.Style.Failure;
      toast.title = `❌ Failed to retry ${stage.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${stage.stageName}`;
      toast.message = getErrorMessage(err);
    });
};
