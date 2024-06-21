import { Action, ActionPanel, captureException, Color, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import {
  CodePipelineClient,
  PipelineExecutionStatus,
  PipelineExecutionSummary,
  StopPipelineExecutionCommand,
} from "@aws-sdk/client-codepipeline";
import { getErrorMessage } from "../../util";

export const StopExecutionAction = ({
  pipelineName,
  revalidatePipeline,
  isLoading,
  executions,
}: {
  pipelineName: string;
  executions?: PipelineExecutionSummary[];
  isLoading: boolean;
  revalidatePipeline: () => void;
}) => {
  return (
    <ActionPanel.Submenu
      title="Stop Execution"
      icon={Icon.Stop}
      shortcut={{ modifiers: ["ctrl"], key: "s" }}
      isLoading={isLoading}
      filtering
    >
      {(executions ?? [])
        .filter((e) => e.status === PipelineExecutionStatus.InProgress)
        .map((e) => (
          <Action
            key={`${e.pipelineExecutionId}`}
            icon={{ source: Icon.Hourglass, tintColor: Color.Blue }}
            title={`${e.pipelineExecutionId}`}
            onAction={() => stopExecution(pipelineName, e, revalidatePipeline)}
          />
        ))}
    </ActionPanel.Submenu>
  );
};

const stopExecution = async (
  pipelineName: string,
  e: { pipelineExecutionId?: string },
  revalidatePipeline: () => void,
) => {
  await confirmAlert({
    title: "Are you sure?",
    icon: { source: Icon.Stop, tintColor: Color.Red },
    message: `Stop ${e.pipelineExecutionId} for ${pipelineName}?`,
    primaryAction: {
      title: "Stop",
      onAction: async () => {
        const toast = await showToast(
          Toast.Style.Animated,
          `❗Stopping execution for ${pipelineName}`,
          `Execution ID: ${e.pipelineExecutionId}`,
        );
        new CodePipelineClient({})
          .send(
            new StopPipelineExecutionCommand({
              pipelineName,
              pipelineExecutionId: e.pipelineExecutionId,
              abandon: true,
              reason: "Abandoned by Raycast",
            }),
          )
          .then(({ pipelineExecutionId }) => {
            toast.style = Toast.Style.Success;
            toast.title = `✅ Stopped execution for ${pipelineName}`;
            toast.message = `Execution ID: ${pipelineExecutionId}`;
          })
          .catch((err) => {
            captureException(err);
            toast.style = Toast.Style.Failure;
            toast.title = `❌ Failed to stop execution for ${pipelineName}`;
            toast.message = getErrorMessage(err);
          })
          .finally(revalidatePipeline);
      },
    },
  });
};
