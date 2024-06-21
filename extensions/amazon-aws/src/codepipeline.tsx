import { PipelineExecutionStatus } from "@aws-sdk/client-codepipeline";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { usePipelines } from "./hooks/use-codepipeline";
import { ToggleStageTransitionAction } from "./components/codepipeline/toggle-stage-transition-action";
import { RetryStageExecutionAction } from "./components/codepipeline/retry-stage-execution-action";
import { StopExecutionAction } from "./components/codepipeline/stop-execution-action";

export default function CodePipeline() {
  const { pipelines, error, isLoading, revalidate, pagination } = usePipelines();

  return (
    <List
      isLoading={isLoading}
      filtering
      pagination={pagination}
      searchBarPlaceholder="Filter pipelines by name, executionId..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && pipelines?.length === 0 && (
        <List.EmptyView title="No pipelines found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {pipelines?.map((pipeline) => (
        <List.Item
          key={pipeline.pipelineKey}
          title={pipeline.name || ""}
          keywords={[
            pipeline.name || "",
            pipeline.pipelineType || "",
            pipeline.executionMode || "",
            ...(pipeline.executions || []).map((e) => e.pipelineExecutionId || ""),
          ]}
          icon={{ source: "aws-icons/cp.png", mask: Image.Mask.RoundedRectangle }}
          actions={
            <ActionPanel>
              <AwsAction.Console url={resourceToConsoleLink(pipeline.name, "AWS::CodePipeline::Pipeline")} />
              <ActionPanel.Section title={"Pipeline Actions"}>
                <ToggleStageTransitionAction
                  pipelineName={pipeline.name!}
                  revalidatePipeline={revalidate}
                  isLoading={isLoading}
                  stages={pipeline.stages}
                />
                <RetryStageExecutionAction
                  pipelineName={pipeline.name!}
                  revalidatePipeline={revalidate}
                  isLoading={isLoading}
                  stages={pipeline.stages}
                />
                <StopExecutionAction
                  pipelineName={pipeline.name!}
                  revalidatePipeline={revalidate}
                  executions={pipeline.executions}
                  isLoading={isLoading}
                />
                <Action.CopyToClipboard title="Copy Pipeline Name" content={pipeline.name || ""} />
                <Action.CopyToClipboard
                  title="Copy Latest Execution ID"
                  content={pipeline.executions?.[0].pipelineExecutionId || ""}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
          accessories={[
            {
              text: pipeline.pipelineType,
              icon: { source: Icon.Tag, tintColor: Color.Blue },
              tooltip: "Pipeline Type",
            },
            {
              text: pipeline.executionMode,
              icon: { source: Icon.Bolt, tintColor: Color.Orange },
              tooltip: "Execution Mode",
            },
            { date: pipeline.updated, icon: Icon.Calendar, tooltip: "Last Updated" },
            pipeline.executions?.[0].status
              ? { icon: statusToIconMap[pipeline.executions?.[0].status], tooltip: pipeline.executions?.[0].status }
              : { icon: { source: Icon.CircleProgress, tintColor: Color.Blue }, tooltip: "NotStarted" },
          ]}
        />
      ))}
    </List>
  );
}

const statusToIconMap: Record<PipelineExecutionStatus, Image> = {
  [PipelineExecutionStatus.Failed]: { source: Icon.XMarkCircleFilled, tintColor: Color.Red },
  [PipelineExecutionStatus.InProgress]: { source: Icon.Hourglass, tintColor: Color.Blue },
  [PipelineExecutionStatus.Succeeded]: { source: Icon.CheckRosette, tintColor: Color.Green },
  [PipelineExecutionStatus.Stopped]: { source: Icon.Important, tintColor: Color.Orange },
  [PipelineExecutionStatus.Cancelled]: { source: Icon.CircleDisabled, tintColor: Color.Yellow },
  [PipelineExecutionStatus.Stopping]: { source: Icon.Important, tintColor: Color.Orange },
  [PipelineExecutionStatus.Superseded]: { source: Icon.BandAid, tintColor: Color.Blue },
};
