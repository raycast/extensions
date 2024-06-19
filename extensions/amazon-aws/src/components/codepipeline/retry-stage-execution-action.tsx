import { Action, ActionPanel, captureException, Color, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import {
  CodePipelineClient,
  RetryStageExecutionCommand,
  StageExecutionStatus,
  StageRetryMode,
  StageState,
} from "@aws-sdk/client-codepipeline";
import { getErrorMessage } from "../../util";

export const RetryStageExecutionAction = ({
  pipelineName,
  revalidatePipeline,
  isLoading,
  stages,
}: {
  pipelineName: string;
  revalidatePipeline: () => void;
  isLoading: boolean;
  stages?: StageState[];
}) => {
  return (
    <ActionPanel.Submenu
      title="Retry Stage Execution"
      icon={Icon.BandAid}
      shortcut={{ modifiers: ["ctrl"], key: "r" }}
      isLoading={isLoading}
      filtering
    >
      {(stages ?? [])
        .filter(
          (s) =>
            s.latestExecution?.status === StageExecutionStatus.Failed ||
            s.latestExecution?.status === StageExecutionStatus.Stopped,
        )
        .flatMap((s) => [
          { ...s, retryMode: StageRetryMode.ALL_ACTIONS },
          { ...s, retryMode: StageRetryMode.FAILED_ACTIONS },
        ])
        .map((s) => (
          <Action
            key={`${s.retryMode}-${pipelineName}-${s.stageName}`}
            icon={{
              source: s.retryMode === StageRetryMode.ALL_ACTIONS ? Icon.Patch : Icon.BandAid,
              tintColor: Color.Orange,
            }}
            title={
              s.retryMode === StageRetryMode.ALL_ACTIONS
                ? `${s.stageName}: All actions`
                : `${s.stageName}: Failed actions`
            }
            onAction={() => retryStageExecution(pipelineName, s, revalidatePipeline)}
          />
        ))}
    </ActionPanel.Submenu>
  );
};

const retryStageExecution = async (
  pipelineName: string,
  s: { retryMode: StageRetryMode; stageName?: string; latestExecution?: { pipelineExecutionId?: string } },
  revalidatePipeline: () => void,
) => {
  await confirmAlert({
    title: "Are you sure?",
    icon: {
      source: s.retryMode === StageRetryMode.ALL_ACTIONS ? Icon.Patch : Icon.BandAid,
      tintColor: Color.Orange,
    },
    message: `Retry ${s.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${s.stageName}?`,
    primaryAction: {
      title: "Retry",
      onAction: async () => {
        const toast = await showToast(
          Toast.Style.Animated,
          `Retrying ${s.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${s.stageName}`,
        );
        new CodePipelineClient({})
          .send(
            new RetryStageExecutionCommand({
              pipelineName,
              pipelineExecutionId: s.latestExecution!.pipelineExecutionId,
              stageName: s.stageName,
              retryMode: s.retryMode,
            }),
          )
          .then(({ pipelineExecutionId }) => {
            toast.style = Toast.Style.Success;
            toast.title = `✅ Retried ${s.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${s.stageName}`;
            toast.message = `Execution ID: ${pipelineExecutionId}`;
          })
          .catch((err) => {
            captureException(err);
            toast.style = Toast.Style.Failure;
            toast.title = `❌ Failed to retry ${s.retryMode === StageRetryMode.ALL_ACTIONS ? "all actions" : "failed actions"} in ${s.stageName}`;
            toast.message = getErrorMessage(err);
          })
          .finally(revalidatePipeline);
      },
    },
  });
};
