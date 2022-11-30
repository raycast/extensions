import {
  CodePipelineClient,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
  PipelineSummary,
} from "@aws-sdk/client-codepipeline";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown, { AWS_URL_BASE } from "./util/aws-profile-dropdown";

export default function CodePipeline() {
  const { data: pipelines, error, isLoading, revalidate } = useCachedPromise(fetchPipelines);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter codepipelines by name..."
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

  const status = execution?.status || "Idle";

  return (
    <List.Item
      id={pipeline.name}
      key={pipeline.name}
      title={pipeline.name || "Unknown pipeline name"}
      subtitle={status}
      icon={Icon.List}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={`${AWS_URL_BASE}/codesuite/codepipeline/pipelines/${pipeline.name}/view?region=${process.env.AWS_REGION}`}
          />
          <Action.CopyToClipboard title="Copy Pipeline Name" content={pipeline.name || ""} />
        </ActionPanel>
      }
      accessories={[{ date: pipeline.updated || pipeline.created }, { icon: iconMap[status], tooltip: status }]}
    />
  );
}

const iconMap: { [key: string]: Icon } = {
  Failed: Icon.ExclamationMark,
  Idle: Icon.Circle,
  InProgress: Icon.CircleProgress50,
  Succeeded: Icon.CircleProgress100,
  Stopped: Icon.CircleFilled,
};

async function fetchPipelines(token?: string, accPipelines?: PipelineSummary[]): Promise<PipelineSummary[]> {
  const { nextToken, pipelines } = await new CodePipelineClient({}).send(
    new ListPipelinesCommand({ nextToken: token })
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
    new ListPipelineExecutionsCommand({ pipelineName })
  );
  return pipelineExecutionSummaries?.[0];
}
