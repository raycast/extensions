import { ActionPanel, List, Icon, Image, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getCIRefreshInterval, getGitLabGQL, gitlab } from "../common";
import { gql } from "@apollo/client";
import { getErrorMessage, getIdFromGqlId, now, showErrorToast } from "../utils";
import { RefreshJobsAction, RetryJobAction } from "./job_actions";
import useInterval from "use-interval";
import { GitLabOpenInBrowserAction } from "./actions";
import { Project } from "../gitlabapi";
import { GitLabIcons } from "../icons";

export interface Job {
  id: string;
  projectId: number;
  name: string;
  status: string;
  allowFailure: boolean;
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
                allowFailure
                pipeline {
                  project {
                    id
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export function getCIJobStatusIcon(status: string, allowFailure: boolean): Image {
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
      return allowFailure
        ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
        : { source: GitLabIcons.status_failed, tintColor: Color.Red };
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

export function getCIJobStatusEmoji(status: string): string {
  switch (status.toLowerCase()) {
    case "success": {
      return "✅";
    }
    case "created": {
      return "🔨";
    }
    case "pending": {
      return "⏰";
    }
    case "running": {
      return "🔄";
    }
    case "failed": {
      return "❌";
    }
    case "canceled": {
      return "🛑";
    }
    case "skipped": {
      return "➡️";
    }
    case "scheduled": {
      return "🕐";
    }
    case "manual": {
      return "👨‍💼";
    }
    default:
      console.log(status);
      return "💼";
  }
  /*
  missing
  * WAITING_FOR_RESOURCE
  * PREPARING
  */
}

function getStatusText(status: string, allowFailure: boolean) {
  const s = status.toLowerCase();
  if (s === "success") {
    return "passed";
  } else if (allowFailure) {
    return "allowed to fail";
  } else {
    return status;
  }
}

export function JobListItem(props: { job: Job; projectFullPath: string; onRefreshJobs: () => void }) {
  const job = props.job;
  const icon = getCIJobStatusIcon(job.status, job.allowFailure);
  const subtitle = "#" + getIdFromGqlId(job.id);
  const status = getStatusText(job.status.toLowerCase(), job.allowFailure);
  return (
    <List.Item
      id={job.id}
      icon={icon}
      title={job.name}
      subtitle={subtitle}
      accessories={[{ text: status }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitLabOpenInBrowserAction
              url={getGitLabGQL().urlJoin(`${props.projectFullPath}/-/jobs/${getIdFromGqlId(job.id)}`)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RefreshJobsAction onRefreshJobs={props.onRefreshJobs} />
            <RetryJobAction job={props.job} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function JobList(props: {
  projectFullPath: string;
  pipelineID: number;
  pipelineIID?: string | undefined;
  navigationTitle?: string;
}) {
  const { stages, error, isLoading, refresh } = useSearch(
    "",
    props.projectFullPath,
    props.pipelineID,
    props.pipelineIID,
  );
  useInterval(() => {
    refresh();
  }, getCIRefreshInterval());
  if (error) {
    showErrorToast(error, "Cannot search Pipelines");
  }
  if (!stages) {
    return <List isLoading={isLoading} navigationTitle={props.navigationTitle || "Jobs"} />;
  }
  return (
    <List isLoading={isLoading} navigationTitle={props.navigationTitle || "Jobs"}>
      {Object.keys(stages).map((stagekey) => (
        <List.Section key={stagekey} title={stagekey}>
          {stages[stagekey].map((job) => (
            <JobListItem job={job} projectFullPath={props.projectFullPath} onRefreshJobs={refresh} key={job.id} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface RESTJob {
  id: number;
  pipeline: Pipeline;
  status: string;
  stage: string;
  name: string;
  allowFailure: boolean;
}

export function useSearch(
  query: string | undefined,
  projectFullPath: string,
  pipelineID: number,
  pipelineIID?: string | undefined,
): {
  stages?: Record<string, Job[]>;
  error?: string;
  isLoading: boolean;
  refresh: () => void;
} {
  const [stages, setStages] = useState<Record<string, Job[]> | undefined>();
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
        if (pipelineIID) {
          const data = await getGitLabGQL().client.query({
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
              stages[stage.name].push({
                id: job.id,
                projectId: getIdFromGqlId(job.pipeline.project.id),
                name: job.name,
                status: job.status,
                allowFailure: job.allowFailure,
              });
            }
          }
          if (!didUnmount) {
            setStages(stages);
          }
        } else if (pipelineID) {
          const projectUE = encodeURIComponent(projectFullPath);
          const jobs: RESTJob[] = await gitlab
            .fetch(`projects/${projectUE}/pipelines/${pipelineID}/jobs`)
            .then((data) => data as RESTJob[]);
          jobs.sort((a, b) => a.id - b.id);
          const stages: Record<string, Job[]> = {};
          for (const job of jobs) {
            if (!stages[job.stage]) {
              stages[job.stage] = [];
            }
            stages[job.stage].push({
              id: `${job.id}`,
              projectId: job.pipeline.project_id,
              name: job.name,
              status: job.status,
              allowFailure: job.allowFailure,
            });
          }
          if (!didUnmount) {
            setStages(stages);
          }
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

export function PipelineJobsListByCommit(props: { project: Project; sha: string }) {
  const { commit, isLoading, error } = useCommit(props.project.id, props.sha);
  if (error) {
    showErrorToast(error, "Could not fetch Commit Details");
  }
  if (isLoading || !commit) {
    return <List isLoading={isLoading} />;
  }
  if (commit.last_pipeline) {
    return (
      <JobList
        projectFullPath={props.project.fullPath}
        pipelineID={commit.last_pipeline.id}
        pipelineIID={commit.last_pipeline.iid ? `${commit.last_pipeline.iid}` : undefined}
      />
    );
  }
  return (
    <List>
      <List.Item title="No pipelines attached" />
    </List>
  );
}

function useCommit(
  projectID: number,
  sha: string,
): {
  commit?: Commit;
  error?: string;
  isLoading: boolean;
} {
  const [commit, setCommit] = useState<Commit>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
