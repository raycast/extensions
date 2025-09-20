import {
  PipelineExecutionStatus,
  PipelineExecutionSummary,
  PipelineSummary,
  StageState,
} from "@aws-sdk/client-codepipeline";
import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";
import { usePipelines } from "./hooks/use-codepipeline";
import { ToggleStageTransitionAction } from "./components/codepipeline/toggle-stage-transition-action";
import { StopExecutionAction } from "./components/codepipeline/stop-execution-action";
import { useFrecencySorting } from "@raycast/utils";
import { RetryStageExecutionAction } from "./components/codepipeline/retry-stage-execution-action";

export type PipelineStage = StageState & {
  nextStage?: StageState;
};

export type Pipeline = PipelineSummary & {
  latestExecution?: PipelineExecutionSummary;
};

export default function CodePipeline() {
  const { pipelines, error, isLoading, mutate } = usePipelines();

  const {
    data: sortedPipelines,
    resetRanking,
    visitItem: visit,
  } = useFrecencySorting(pipelines, {
    key: (pipeline) => pipeline.name!,
    namespace: "aws-pipelines",
    sortUnvisited: (a, b) => a.name!.localeCompare(b.name!),
  });

  return (
    <List
      isLoading={isLoading}
      filtering
      searchBarPlaceholder="Filter pipelines by name, type, mode..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={mutate} />}
    >
      {error && (
        <List.EmptyView
          title={error.name}
          description={error.message}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
        />
      )}
      {!error && sortedPipelines?.length === 0 && (
        <List.EmptyView title="No pipelines found!" icon={{ source: Icon.Warning, tintColor: Color.Orange }} />
      )}
      {sortedPipelines?.map((pipeline) => (
        <List.Item
          key={pipeline.name!}
          title={pipeline.name!}
          keywords={[pipeline.name!, pipeline.pipelineType || "", pipeline.executionMode || ""]}
          icon={{ source: "aws-icons/cp.png", mask: Image.Mask.RoundedRectangle }}
          actions={
            <ActionPanel>
              <AwsAction.Console
                url={resourceToConsoleLink(pipeline.name, "AWS::CodePipeline::Pipeline")}
                onAction={() => visit(pipeline)}
              />
              <ActionPanel.Section title={"Pipeline Actions"}>
                <ToggleStageTransitionAction {...{ pipeline, mutate, visit }} />
                <RetryStageExecutionAction {...{ pipeline, mutate, visit }} />
                <StopExecutionAction {...{ pipeline, mutate, visit }} />
                <Action.CopyToClipboard
                  title="Copy Pipeline Name"
                  content={pipeline.name || ""}
                  onCopy={() => visit(pipeline)}
                />
                {pipeline.latestExecution && pipeline.latestExecution.pipelineExecutionId && (
                  <Action.CopyToClipboard
                    title="Copy Latest Execution ID"
                    content={pipeline.latestExecution.pipelineExecutionId}
                    onCopy={() => visit(pipeline)}
                  />
                )}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Reset Ranking"
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => resetRanking(pipeline)}
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
            pipeline.latestExecution && pipeline.latestExecution.status
              ? {
                  icon: statusToIconMap[pipeline.latestExecution.status],
                  tooltip: [
                    pipeline.latestExecution.status,
                    ...(pipeline.latestExecution.statusSummary ? [": ", pipeline.latestExecution.statusSummary] : []),
                  ].join(""),
                }
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
