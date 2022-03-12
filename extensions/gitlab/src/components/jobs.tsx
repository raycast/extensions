import { ActionPanel, List, Icon, Image, Color, showToast, ToastStyle, ListSection, ListItem } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCIRefreshInterval, gitlab, gitlabgql } from "../common";
import { gql } from "@apollo/client";
import { getErrorMessage, getIdFromGqlId, now } from "../utils";
import { RefreshJobsAction } from "./job_actions";
import useInterval from "use-interval";
import { GitLabOpenInBrowserAction } from "./actions";
import { Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";

export interface Job {
  id: string;
  name: string;
  status: string;
}

const GET_PIPELINE_JOBS = gql`
  query GetProjectPipelines($fullPath: ID!, $pipelineIID: ID!) {
    project(fullPath: $fullPath) {
      pipeline(iid: $pipelineIID) {
        stages {
          nodes {
            name
            jobs {
              nodes {
                id
                name
                status
              }
            }
          }
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
    case "skipped": {
      return { source: GitLabIcons.status_skipped, tintColor: "#868686" };
    }
    case "scheduled": {
      return { source: GitLabIcons.status_scheduled, tintColor: Color.Blue };
    }
    default:
      return { source: Icon.ExclamationMark, tintColor: Color.Magenta };
  }
  /*
  missing 
  * WAITING_FOR_RESOURCE
  * PREPARING
  * MANUAL
  */
}

function getStatusText(status: string) {
  const s = status.toLowerCase();
  if (s === "success") {
    return "passed";
  } else {
    return status;
  }
}

export function JobListItem(props: { job: Job; projectFullPath: string; onRefreshJobs: () => void }): JSX.Element {
  const job = props.job;
  const icon = getIcon(job.status);
  const subtitle = "#" + getIdFromGqlId(job.id);
  const status = getStatusText(job.status.toLowerCase());
  return (
    <List.Item
      id={job.id}
      icon={icon}
      title={job.name}
      subtitle={subtitle}
      accessoryTitle={status}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitLabOpenInBrowserAction
              url={gitlabgql.urlJoin(`${props.projectFullPath}/-/jobs/${getIdFromGqlId(job.id)}`)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RefreshJobsAction onRefreshJobs={props.onRefreshJobs} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function JobList(props: { projectFullPath: string; pipelineIID: string }): JSX.Element {
  const { stages, error, isLoading, refresh } = useSearch("", props.projectFullPath, props.pipelineIID);
  useInterval(() => {
    refresh();
  }, getCIRefreshInterval());
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Pipelines", error);
  }
  return (
    <List isLoading={isLoading} navigationTitle="Jobs">
      {Object.keys(stages).map((stagekey) => (
        <ListSection key={stagekey} title={stagekey}>
          {stages[stagekey].map((job) => (
            <JobListItem job={job} projectFullPath={props.projectFullPath} onRefreshJobs={refresh} key={job.id} />
          ))}
        </ListSection>
      ))}
    </List>
  );
}

export function useSearch(
  query: string | undefined,
  projectFullPath: string,
  pipelineIID: string
): {
  stages: Record<string, Job[]>;
  error?: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [stages, setStages] = useState<Record<string, Job[]>>({});
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
          query: GET_PIPELINE_JOBS,
          variables: { fullPath: projectFullPath, pipelineIID: pipelineIID },
          fetchPolicy: "network-only",
        });
        const stages: Record<string, Job[]> = {};
        for (const stage of data.data.project.pipeline.stages.nodes) {
          if (!stages[stage.name]) {
            stages[stage.name] = [];
          }
          for (const job of stage.jobs.nodes) {
            stages[stage.name].push({ id: job.id, name: job.name, status: job.status });
          }
        }
        if (!didUnmount) {
          setStages(stages);
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
  }, [query, projectFullPath, pipelineIID, timestamp]);

  return { stages, error, isLoading, refresh };
}

interface Pipeline {
  id: number;
  iid: number;
  project_id: number;
  sha: string;
  ref: string;
  status: string;
  source: string;
}

interface Commit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  status?: string;
  project_id: number;
  last_pipeline?: Pipeline;
}

export function PipelineJobsListByCommit(props: { project: Project; sha: string }): JSX.Element {
  const { commit, isLoading, error } = useCommit(props.project.id, props.sha);
  if (error) {
    showToast(ToastStyle.Failure, "Could not fetch Commit Details", error);
  }
  if (isLoading || !commit) {
    return <List isLoading={isLoading} searchBarPlaceholder="Loading" />;
  } else {
    if (commit.last_pipeline) {
      return <JobList projectFullPath={props.project.fullPath} pipelineIID={`${commit.last_pipeline.iid}`} />;
    } else {
      return (
        <List>
          <ListItem title="No piplelines attached" />
        </List>
      );
    }
  }
}

function useCommit(
  projectID: number,
  sha: string
): {
  commit?: Commit;
  error?: string;
  isLoading: boolean;
} {
  const [commit, setCommit] = useState<Commit>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // FIXME In the future version, we don't need didUnmount checking
    // https://github.com/facebook/react/pull/22114
    let didUnmount = false;

    async function fetchData() {
      if (didUnmount) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const glCommit = await gitlab.fetch(`projects/${projectID}/repository/commits/${sha}`).then((data) => {
          return data as Commit;
        });
        if (!didUnmount) {
          setCommit(glCommit);
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
  }, [projectID, sha]);

  return { commit, error, isLoading };
}
