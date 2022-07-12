import { Action, ActionPanel, List, Icon, Image, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCIRefreshInterval, getGitLabGQL } from "../common";
import { gql } from "@apollo/client";
import { ensureCleanAccessories, getErrorMessage, getIdFromGqlId, now, showErrorToast } from "../utils";
import { JobList } from "./jobs";
import { RefreshPipelinesAction } from "./pipeline_actions";
import useInterval from "use-interval";
import { GitLabOpenInBrowserAction } from "./actions";
import { GitLabIcons } from "../icons";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

const GET_PIPELINES = gql`
  query GetProjectPipeplines($fullPath: ID!) {
    project(fullPath: $fullPath) {
      pipelines {
        nodes {
          id
          iid
          status
          active
          path
          ref
        }
      }
    }
  }
`;

function getIcon(status: string): Image {
  switch (status.toLowerCase()) {
    case "success": {
      return { source: GitLabIcons.status_success, tintColor: Color.Green };
    }
    case "created": {
      return { source: GitLabIcons.status_created, tintColor: Color.Yellow };
    }
    case "pending": {
      return { source: GitLabIcons.status_pending, tintColor: Color.Yellow };
    }
    case "running": {
      return { source: GitLabIcons.status_running, tintColor: Color.Blue };
    }
    case "failed": {
      return { source: GitLabIcons.status_failed, tintColor: Color.Red };
    }
    case "canceled": {
      return { source: GitLabIcons.status_canceled, tintColor: Color.PrimaryText };
    }
    default:
      return { source: GitLabIcons.status_notfound, tintColor: Color.Magenta };
  }
}

function getStatusText(status: string) {
  if (status == "success") {
    return "passed";
  } else {
    return status;
  }
}

export function PipelineListItem(props: {
  pipeline: any;
  projectFullPath: string;
  onRefreshPipelines: () => void;
}): JSX.Element {
  const pipeline = props.pipeline;
  const icon = getIcon(pipeline.status);
  return (
    <List.Item
      id={`${pipeline.id}`}
      title={pipeline.id.toString()}
      icon={icon}
      subtitle={pipeline.ref || ""}
      accessories={ensureCleanAccessories([{ text: getStatusText(pipeline.status.toLowerCase()) }])}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Show Jobs"
              target={
                <JobList projectFullPath={props.projectFullPath} pipelineID={pipeline.id} pipelineIID={pipeline.iid} />
              }
              icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            />
            <GitLabOpenInBrowserAction url={pipeline.webUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RefreshPipelinesAction onRefreshPipelines={props.onRefreshPipelines} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function PipelineList(props: { projectFullPath: string }): JSX.Element {
  const { pipelines, error, isLoading, refresh } = useSearch("", props.projectFullPath);
  useInterval(() => {
    refresh();
  }, getCIRefreshInterval());
  if (error) {
    showErrorToast(error, "Cannot search Pipelines");
  }
  return (
    <List isLoading={isLoading} navigationTitle="Pipelines">
      {pipelines?.map((pipeline) => (
        <PipelineListItem
          key={pipeline.id}
          pipeline={pipeline}
          projectFullPath={props.projectFullPath}
          onRefreshPipelines={refresh}
        />
      ))}
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  projectFullPath: string
): {
  pipelines: any[];
  error?: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timestamp, setTimestamp] = useState<Date>(now());

  const refresh = () => {
    setTimestamp(now());
  };

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (query === null || didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const data = await getGitLabGQL().client.query({
          query: GET_PIPELINES,
          variables: { fullPath: projectFullPath },
          fetchPolicy: "network-only",
        });
        const glData: Record<string, any>[] = data.data.project.pipelines.nodes.map((p: any) => ({
          id: getIdFromGqlId(p.id),
          iid: `${p.iid}`,
          status: p.status,
          active: p.active,
          webUrl: `${getGitLabGQL().url}${p.path}`,
          ref: p.ref,
        }));
        if (!didUnmount) {
          setPipelines(glData);
        }
      } catch (e) {
        if (!didUnmount) {
          setError(getErrorMessage(e));
        }
      } finally {
        if (!didUnmount) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      didUnmount = true;
    };
  }, [query, projectFullPath, timestamp]);

  return { pipelines, error, isLoading, refresh };
}
