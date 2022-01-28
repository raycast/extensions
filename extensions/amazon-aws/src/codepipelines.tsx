import { getPreferenceValues, ActionPanel, List, OpenInBrowserAction, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import * as AWS from "aws-sdk";
import { Preferences } from "./types";

const getExecutionState = (client: AWS.CodePipeline, pipelineName: string) =>
  new Promise<AWS.CodePipeline.PipelineExecutionSummary | null>((resolve, reject) => {
    return client.listPipelineExecutions(
      {
        pipelineName: pipelineName,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.pipelineExecutionSummaries?.[0]) {
            resolve(data.pipelineExecutionSummaries[0]);
          } else {
            resolve(null);
          }
        }
      }
    );
  });

type PipelineSummary = AWS.CodePipeline.PipelineSummary & {
  execution: AWS.CodePipeline.PipelineExecutionSummary | null;
};

export default function DescribeInstances() {
  const preferences: Preferences = getPreferenceValues();
  AWS.config.update({ region: preferences.region });
  const pipeline = new AWS.CodePipeline({ apiVersion: "2016-11-15" });

  const [state, setState] = useState<{
    pipelines: PipelineSummary[];
    loaded: boolean;
    hasError: boolean;
  }>({
    pipelines: [],
    loaded: false,
    hasError: false,
  });

  useEffect(() => {
    if (!preferences.region) return;
    async function fetch() {
      pipeline.listPipelines({}, async (err, data) => {
        if (err) {
          setState({
            hasError: true,
            loaded: false,
            pipelines: [],
          });
        } else {
          const _pipelines: PipelineSummary[] = [];
          for (const p of data?.pipelines ?? []) {
            if (!p.name) {
              continue;
            }
            _pipelines.push({
              ...p,
              execution: await getExecutionState(pipeline, p.name),
            });
          }
          setState({
            hasError: false,
            loaded: true,
            pipelines: _pipelines ?? [],
          });
        }
      });
    }
    fetch();
  }, []);

  if (state.hasError) {
    return (
      <Detail markdown="No valid [configuration and credential file](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter codepipelines by name...">
      {state.pipelines.map((i) => (
        <CodePipelineListItem key={i.name} pipeline={i} />
      ))}
    </List>
  );
}

function CodePipelineListItem({ pipeline }: { pipeline: PipelineSummary }) {
  const preferences: Preferences = getPreferenceValues();

  const status = pipeline?.execution?.status || "Idle";

  return (
    <List.Item
      id={pipeline.name}
      key={pipeline.name}
      title={pipeline.name || "Unknown pipeline name"}
      subtitle={status}
      icon={`codepipeline/${status}.png`}
      accessoryTitle={pipeline.created ? new Date(pipeline.created).toLocaleString() : undefined}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
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
    />
  );
}
