import {
  CodePipelineClient,
  ListPipelineExecutionsCommand,
  ListPipelinesCommand,
  PipelineSummary,
} from "@aws-sdk/client-codepipeline";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./components/searchbar/aws-profile-dropdown";
import { resourceToConsoleLink } from "./util";

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

  const status = execution?.status || "Idle";

  return (
    <List.Item
      id={pipeline.name}
      key={pipeline.name}
      title={pipeline.name || ""}
      icon={"aws-icons/cp.png"}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={resourceToConsoleLink(pipeline.name, "AWS::CodePipeline::Pipeline")}
          />
          <Action.CopyToClipboard title="Copy Pipeline Name" content={pipeline.name || ""} />
        </ActionPanel>
      }
      accessories={[{ text: status }, { icon: iconMap[status] }]}
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
  if (!process.env.AWS_PROFILE) return [];
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
