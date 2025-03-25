import { ActionPanel, List, Action, getPreferenceValues, showToast, Toast, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import fetch from "node-fetch";
import { BUDDY_API_URL } from "../config";

export const PipelinesList = (props: { domain: string; name: string }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [pipelines, setPipelines] = useState<IPipeline[]>([]);

  const { ACCESS_TOKEN } = getPreferenceValues();

  async function getWorkspaces() {
    const response = await fetch(`${BUDDY_API_URL}/workspaces/${props.domain}/projects/${props.name}/pipelines`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    let data: { pipelines: IPipeline[]; errors: IError[] } = { pipelines: [], errors: [] };
    try {
      data = (await response.json()) as PipelinesResponse;
    } catch (e) {
      setError(new Error("while fetching your workspaces"));
    } finally {
      if (data.errors) {
        data.errors.forEach((error) => setError(error));
      }

      setPipelines(data.pipelines);
      setLoading(false);
    }
  }

  useEffect(() => {
    getWorkspaces();
  }, [props.name]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Something went wrong",
        message: error.message,
      });
    }
  }, [error]);

  return (
    <List isLoading={loading}>
      {pipelines && pipelines.length > 0 ? (
        pipelines.map((pipeline, index) => {
          console.log(pipeline);

          let tintColor;
          switch (pipeline.last_execution_status) {
            case "INITIAL":
              tintColor = Color.Yellow;
              break;
            case "INPROGRESS":
              tintColor = Color.Blue;
              break;
            case "SUCCESSFUL":
              tintColor = Color.Green;
              break;
            case "FAILED":
              tintColor = Color.Red;
              break;
            default:
              tintColor = Color.PrimaryText;
          }

          return (
            <List.Item
              key={`pipeline-${index}`}
              icon={{ source: Icon.Circle, tintColor: tintColor }}
              title={pipeline.name}
              subtitle={pipeline.target_site_url}
              actions={
                <ActionPanel title="Buddy">
                  <Action.OpenInBrowser title="Pipeline" url={`${pipeline.html_url}`} />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView icon={Icon.QuestionMark} description="No Pipelines Found" />
      )}
    </List>
  );
};

type PipelinesResponse = {
  url: string;
  html_url: string;
  pipelines: IPipeline[];
  errors: IError[];
};

interface IError {
  message: string;
  name: string;
}

interface IPipeline {
  url: string;
  html_url: string;
  id: number;
  name: string;
  on: string;
  events: [];
  priority: string;
  last_execution_status: string;
  last_execution_revision: string;
  target_site_url: string;
  always_from_scratch: boolean;
  ignore_fail_on_project_status: boolean;
  no_skip_to_most_recent: boolean;
  auto_clear_cache: boolean;
  fetch_all_refs: boolean;
  fail_on_prepare_env_warning: boolean;
  concurrent_pipeline_runs: boolean;
  do_not_create_commit_status: boolean;
  resources: string;
}
