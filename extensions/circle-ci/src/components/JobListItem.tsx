import { Job, JobStatus, Workflow } from "../types";
import { ActionPanel, Color, Icon, ImageLike, List, OpenInBrowserAction } from "@raycast/api";

export const JobListItem = ({ job, workflow }: { job: Job; workflow: Workflow }) => {
  const { project_slug, job_number } = job;
  const { id, pipeline_number } = workflow;
  const slug = project_slug.replace(/\bgh\b/, "github");

  return (
    <List.Item
      id={job.id}
      icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
      key={job.id}
      title={job.name}
      accessoryTitle={getJobAccessoryTitle(job)}
      accessoryIcon={getJobAccessoryIcon(job)}
      actions={
        <ActionPanel>
          <OpenInBrowserAction
            url={`https://app.circleci.com/pipelines/${slug}/${pipeline_number}/workflows/${id}/jobs/${job_number}`}
          />
        </ActionPanel>
      }
    />
  );
};

const getJobAccessoryIcon = ({ status }: { status: JobStatus }): ImageLike => {
  switch (status) {
    case JobStatus.success:
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case JobStatus.failed:
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Gear, tintColor: Color.Blue };
  }
};

const getJobAccessoryTitle = ({ started_at, stopped_at, status }: Job): string => {
  const createdAt = new Date(started_at).toLocaleString();
  const stoppedAt = new Date(stopped_at).toLocaleString();

  switch (status) {
    case JobStatus.success:
      return `Succeeded at ${stoppedAt}`;
    case JobStatus.running:
      return `Running since ${createdAt}`;
    case JobStatus.failed:
      return `Failed at ${stoppedAt}`;
    default:
      return "Unknown";
  }
};
