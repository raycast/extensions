import {
  ActionPanel,
  List,
  OpenInBrowserAction,
  Icon,
  Image,
  Color,
  showToast,
  ToastStyle,
  ListSection,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { gitlabgql } from "../common";
import { gql } from "@apollo/client";
import { getIdFromGqlId } from "../utils";

interface Job {
  id: string;
  name: string;
  status: string;
}

const GET_PIPELINE_JOBS = gql`
  query GetProjectPipeplines($fullPath: ID!, $pipelineIID: ID!) {
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
    case "canceled": {
      return { source: Icon.ExclamationMark, tintColor: Color.Red };
    }
    case "skipped": {
      return { source: Icon.ExclamationMark, tintColor: Color.Brown };
    }
    case "scheduled": {
      return { source: Icon.ExclamationMark, tintColor: Color.Blue };
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

export function JobListItem(props: { job: Job; projectFullPath: string }) {
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
          <OpenInBrowserAction url={gitlabgql.urlJoin(`${props.projectFullPath}/-/jobs/${getIdFromGqlId(job.id)}`)} />
        </ActionPanel>
      }
    />
  );
}

export function JobList(props: { projectFullPath: string; pipelineIID: string }) {
  const { stages, error, isLoading } = useSearch("", props.projectFullPath, props.pipelineIID);
  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Pipelines", error);
  }
  return (
    <List isLoading={isLoading} navigationTitle="Jobs">
      {Object.keys(stages).map((stagekey) => (
        <ListSection key={stagekey} title={stagekey}>
          {stages[stagekey].map((job) => (
            <JobListItem job={job} projectFullPath={props.projectFullPath} />
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
} {
  const [stages, setStages] = useState<Record<string, Job[]>>({});
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  let cancel = false;

  useEffect(() => {
    async function fetchData() {
      if (query === null || cancel) {
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        console.log(projectFullPath);
        console.log(pipelineIID);
        const data = await gitlabgql.client.query({
          query: GET_PIPELINE_JOBS,
          variables: { fullPath: projectFullPath, pipelineIID: pipelineIID },
        });
        const stages: Record<string, Job[]> = {};
        for (const stage of data.data.project.pipeline.stages.nodes) {
          console.log(stage.name);
          if (!stages[stage.name]) {
            stages[stage.name] = [];
          }
          for (const job of stage.jobs.nodes) {
            stages[stage.name].push({ id: job.id, name: job.name, status: job.status });
          }
        }
        if (!cancel) {
          setStages(stages);
        }
      } catch (e: any) {
        if (!cancel) {
          setError(e.message);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancel = true;
    };
  }, [query, projectFullPath, pipelineIID]);

  return { stages, error, isLoading };
}
