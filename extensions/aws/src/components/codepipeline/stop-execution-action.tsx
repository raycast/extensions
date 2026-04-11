import { Action, ActionPanel, captureException, Color, confirmAlert, Icon, showToast, Toast } from "@raycast/api";
import {
  CodePipelineClient,
  PipelineExecutionStatus,
  PipelineExecutionSummary,
  StopPipelineExecutionCommand,
  StopPipelineExecutionCommandInput,
} from "@aws-sdk/client-codepipeline";
import { getErrorMessage } from "../../util";
import { Pipeline } from "../../codepipeline";
import { MutatePromise } from "@raycast/utils";
import { usePipelineExecutions } from "../../hooks/use-codepipeline";

export const StopExecutionAction = ({
  pipeline,
  visit,
  mutate,
}: {
  pipeline: Pipeline;
  mutate: MutatePromise<Pipeline[] | undefined>;
  visit: (pipeline: Pipeline) => Promise<void>;
}) => {
  const { isLoading, executions, mutate: revalidate } = usePipelineExecutions(pipeline.name!);

  return (
    <ActionPanel.Submenu
      title="Stop Execution"
      icon={{ source: Icon.Stop, tintColor: Color.Red }}
      shortcut={{ modifiers: ["ctrl"], key: "s" }}
      isLoading={isLoading}
      onOpen={revalidate}
      filtering
    >
      {(executions ?? [])
        .filter((e) => e.status === PipelineExecutionStatus.InProgress)
        .map((e) => (
          <Action
            key={`${e.pipelineExecutionId}`}
            icon={{ source: Icon.Hourglass, tintColor: Color.Blue }}
            title={`${e.pipelineExecutionId}`}
            onAction={async () => {
              await visit(pipeline);
              await stopExecution(pipeline.name!, e, mutate);
            }}
          />
        ))}
    </ActionPanel.Submenu>
  );
};

const stopExecution = async (
  pipelineName: string,
  execution: PipelineExecutionSummary,
  mutate: MutatePromise<Pipeline[] | undefined>,
) => {
  await confirmAlert({
    title: "Are you sure?",
    icon: { source: Icon.Stop, tintColor: Color.Red },
    message: `Stop ${execution.pipelineExecutionId} for ${pipelineName}?`,
    primaryAction: {
      title: "Stop",
      onAction: () => stop(pipelineName, execution, mutate),
    },
  });
};

const stop = async (
  pipelineName: string,
  execution: PipelineExecutionSummary,
  mutate: MutatePromise<Pipeline[] | undefined>,
) => {
  const input: StopPipelineExecutionCommandInput = {
    pipelineName,
    pipelineExecutionId: execution.pipelineExecutionId,
    abandon: true,
    reason: "Abandoned by Raycast",
  };

  const toast = await showToast(
    Toast.Style.Animated,
    `❗Stopping execution for ${pipelineName}`,
    `Execution ID: ${execution.pipelineExecutionId}`,
  );

  mutate(new CodePipelineClient({}).send(new StopPipelineExecutionCommand(input)), {
    optimisticUpdate: (pipelines) => {
      if (!pipelines) {
        return;
      }

      return pipelines.map((p) =>
        p.name === pipelineName
          ? {
              ...p,
              ...(p.latestExecution && {
                latestExecution: {
                  ...p.latestExecution,
                  status: PipelineExecutionStatus.Stopped,
                  statusSummary: "Stopped execution",
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
      toast.title = `✅ Stopped execution for ${pipelineName}`;
      toast.message = `Execution ID: ${pipelineExecutionId}`;
    })
    .catch((err) => {
      captureException(err);
      toast.style = Toast.Style.Failure;
      toast.title = `❌ Failed to stop execution for ${pipelineName}`;
      toast.message = getErrorMessage(err);
    });
};
