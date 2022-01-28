import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  Icon,
  Image,
  Color,
  showToast,
  ToastStyle,
  PushAction,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { getCIRefreshInterval, gitlabgql } from "../common";
import { gql } from "@apollo/client";
import { getIdFromGqlId, now } from "../utils";
import { JobList } from "./jobs";
import { RefreshPipelinesAction } from "./pipeline_actions";
import useInterval from "use-interval";

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
      return { source: Icon.Checkmark, tintColor: Color.Green };
    }
    case "created": {
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    }
    case "pending": {
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    }
    case "running": {
      return { source: Icon.ExclamationMark, tintColor: Color.Blue };
    }
    case "failed": {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    default:
      return { source: Icon.ExclamationMark, tintColor: Color.Magenta };
  }
}

function getStatusText(status: string) {
  if (status == "success") {
    return "passed";
  } else {
    return status;
  }
}

export function PipelineListItem(props: { pipeline: any; projectFullPath: string; onRefreshPipelines: () => void }) {
  const pipeline = props.pipeline;
  const icon = getIcon(pipeline.status);
  return (
    <List.Item
      id={pipeline.id}
      title={pipeline.id.toString()}
      icon={icon}
      subtitle={pipeline.ref || ""}
      accessoryTitle={getStatusText(pipeline.status.toLowerCase())}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <PushAction
              title="Show Jobs"
              target={<JobList projectFullPath={props.projectFullPath} pipelineIID={pipeline.iid} />}
              icon={{ source: Icon.Terminal, tintColor: Color.PrimaryText }}
            />
            <OpenInBrowserAction url={pipeline.webUrl} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RefreshPipelinesAction onRefreshPipelines={props.onRefreshPipelines} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function PipelineList(props: { projectFullPath: string }) {
  const { pipelines, error, isLoading, refresh } = useSearch("", props.projectFullPath);
  useInterval(() => {
    refresh();
  }, getCIRefreshInterval());
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Pipelines", error);
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
        const data = await gitlabgql.client.query({
          query: GET_PIPELINES,
          variables: { fullPath: projectFullPath },
          fetchPolicy: "network-only",
        });
        const glData: Record<string, any>[] = data.data.project.pipelines.nodes.map((p: any) => ({
          id: getIdFromGqlId(p.id),
          iid: `${p.iid}`,
          status: p.status,
          active: p.active,
          webUrl: `${gitlabgql.url}${p.path}`,
          ref: p.ref,
        }));
        if (!didUnmount) {
          setPipelines(glData);
        }
      } catch (e: any) {
        if (!didUnmount) {
          setError(e.message);
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
