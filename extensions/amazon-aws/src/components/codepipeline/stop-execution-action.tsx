import { Action, ActionPanel, captureException, Color, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import {
  CodePipelineClient,
  PipelineExecutionStatus,
  PipelineExecutionSummary,
  StopPipelineExecutionCommand,
} from "@aws-sdk/client-codepipeline";
import { getErrorMessage } from "../../util";
import { Pipeline } from "../../codepipeline";
import { MutatePromise } from "@raycast/utils";

export const StopExecutionAction = ({
  pipeline,
  isLoading,
  mutate,
}: {
  pipeline: Pipeline;
  isLoading: boolean;
  mutate: MutatePromise<Pipeline[]>;
}) => {
  return (
    <ActionPanel.Submenu
      title="Stop Execution"
      icon={Icon.Stop}
      shortcut={{ modifiers: ["ctrl"], key: "s" }}
      isLoading={isLoading}
      filtering
    >
      {pipeline.executions
        .filter((e) => e.status === PipelineExecutionStatus.InProgress)
        .map((e) => (
          <Action
            key={`${e.pipelineExecutionId}`}
            icon={{ source: Icon.Hourglass, tintColor: Color.Blue }}
            title={`${e.pipelineExecutionId}`}
            onAction={() => stopExecution(pipeline.name!, e, mutate)}
          />
        ))}
    </ActionPanel.Submenu>
  );
};

const stopExecution = async (
  pipelineName: string,
  execution: PipelineExecutionSummary,
  mutate: MutatePromise<Pipeline[]>,
) => {
  await confirmAlert({
    title: "Are you sure?",
    icon: { source: Icon.Stop, tintColor: Color.Red },
    message: `Stop ${execution.pipelineExecutionId} for ${pipelineName}?`,
    primaryAction: {
      title: "Stop",
      onAction: async () => {
        const toast = await showToast(
          Toast.Style.Animated,
          `❗Stopping execution for ${pipelineName}`,
          `Execution ID: ${execution.pipelineExecutionId}`,
        );
        new CodePipelineClient({})
          .send(
            new StopPipelineExecutionCommand({
              pipelineName,
              pipelineExecutionId: execution.pipelineExecutionId,
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
          .finally(mutate);
      },
    },
  });
};
