import {
  CodePipelineClient,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
  PipelineExecutionStatus,
  PipelineSummary,
} from "@aws-sdk/client-codepipeline";
import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { isReadyToFetch, resourceToConsoleLink } from "./util";
import { AwsAction } from "./components/common/action";

export default function CodePipeline() {
  const { data: pipelines, error, isLoading, revalidate } = useCachedPromise(fetchPipelines);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter pipelines by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        pipelines?.map((i) => <CodePipelineListItem key={i.name} pipeline={i} />)
      )}
    </List>
  );
}

function CodePipelineListItem({ pipeline }: { pipeline: PipelineSummary }) {
  const { data: execution } = useCachedPromise(fetchExecutionState, [pipeline.name]);

  const status = execution?.status;

  return (
    <List.Item
      key={pipeline.name}
      title={pipeline.name || ""}
      icon={"aws-icons/cp.png"}
      actions={
        <ActionPanel>
          <AwsAction.Console url={resourceToConsoleLink(pipeline.name, "AWS::CodePipeline::Pipeline")} />
          <Action.CopyToClipboard title="Copy Pipeline Name" content={pipeline.name || ""} />
        </ActionPanel>
      }
      accessories={[
        status
          ? {
              tag: { value: status, color: statusToIconAndColorMap[status].color },
              icon: statusToIconAndColorMap[status].icon,
            }
          : { tag: "NotStarted", icon: Icon.CircleEllipsis },
      ]}
    />
  );
}

const statusToIconAndColorMap: Record<PipelineExecutionStatus, { icon: Icon; color: Color }> = {
  [PipelineExecutionStatus.Failed]: { icon: Icon.XMarkCircleFilled, color: Color.Red },
  [PipelineExecutionStatus.InProgress]: { icon: Icon.CircleProgress, color: Color.Blue },
  [PipelineExecutionStatus.Succeeded]: { icon: Icon.CheckRosette, color: Color.Green },
  [PipelineExecutionStatus.Stopped]: { icon: Icon.Important, color: Color.Orange },
  [PipelineExecutionStatus.Cancelled]: { icon: Icon.CircleDisabled, color: Color.Yellow },
  [PipelineExecutionStatus.Stopping]: { icon: Icon.Important, color: Color.Orange },
  [PipelineExecutionStatus.Superseded]: { icon: Icon.BandAid, color: Color.Blue },
};

async function fetchPipelines(token?: string, accPipelines?: PipelineSummary[]): Promise<PipelineSummary[]> {
  if (!isReadyToFetch()) return [];
  const { nextToken, pipelines } = await new CodePipelineClient({}).send(
    new ListPipelinesCommand({ nextToken: token }),
  );
  const combinedPipelines = [...(accPipelines || []), ...(pipelines || [])];

  if (nextToken) {
    return fetchPipelines(nextToken, combinedPipelines);
  }

  return combinedPipelines.filter((p) => !!p.name);
}

async function fetchExecutionState(pipelineName?: string) {
  if (!pipelineName) {
    return;
  }

  const { pipelineExecutionSummaries } = await new CodePipelineClient({}).send(
    new ListPipelineExecutionsCommand({ pipelineName }),
  );
  return pipelineExecutionSummaries?.[0];
}
