import { ActionPanel, List, Detail, Action, Icon } from "@raycast/api";
import * as AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { useCachedPromise } from "@raycast/utils";
import { PipelineSummary } from "aws-sdk/clients/codepipeline";

const preferences = setupAws();
const pipeline = new AWS.CodePipeline({ apiVersion: "2016-11-15" });

export default function DescribeInstances() {
  const { data: pipelines, error, isLoading } = useCachedPromise(fetchPipelines);

  if (error) {
    return (
      <Detail markdown="No valid [configuration and credential file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter codepipelines by name...">
      {pipelines?.map((i) => (
        <CodePipelineListItem key={i.name} pipeline={i} />
      ))}
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
      icon={iconMap[status]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://console.aws.amazon.com/codesuite/codepipeline/pipelines/" +
              pipeline.name +
              "/view?region=" +
              preferences.region
            }
          />
        </ActionPanel>
      }
      accessories={[
        {
          text: pipeline.created ? new Date(pipeline.created).toLocaleString() : undefined,
        },
      ]}
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
  const { nextToken, pipelines } = await pipeline.listPipelines({ nextToken: token }).promise();
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
  const { pipelineExecutionSummaries } = await pipeline.listPipelineExecutions({ pipelineName }).promise();
  return pipelineExecutionSummaries?.[0];
}
