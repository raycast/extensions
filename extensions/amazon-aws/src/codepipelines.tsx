import { getPreferenceValues, ActionPanel, List, OpenInBrowserAction, Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import * as AWS from "aws-sdk";
import { Preferences } from "./types";
import setupAws from "./util/setupAws";

setupAws();

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
  execution?: AWS.CodePipeline.PipelineExecutionSummary | null;
};

export default function DescribeInstances() {
  const preferences: Preferences = getPreferenceValues();
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
    async function fetch(token?: string, accPipelines?: PipelineSummary[]): Promise<PipelineSummary[]> {
      const { nextToken, pipelines } = await pipeline.listPipelines({ nextToken: token }).promise();
      const combinedPipelines = [...(accPipelines || []), ...(pipelines || [])];

      if (nextToken) {
        return fetch(nextToken, combinedPipelines);
      }

      return combinedPipelines.filter((p) => !!p.name);
    }

    fetch()
      .then((pipelines) => {
        setState({ hasError: false, loaded: true, pipelines });

        pipelines.forEach(async (p) => {
          const execution = await getExecutionState(pipeline, p.name as string);
          setState((state) => ({
            ...state,
            pipelines: state.pipelines.map((el) => (el.name === p.name ? { ...p, execution } : el)),
          }));
        });
      })
      .catch(() => setState({ hasError: true, loaded: false, pipelines: [] }));
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
