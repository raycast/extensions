import { Job, JobStatus } from "../types";
import { Color, Icon, ImageLike, List } from "@raycast/api";

export const JobListItem = (props: { job: Job }) => {
  const job = props.job;

  return (
    <List.Item
      id={job.id}
      icon={{ source: Icon.Terminal, tintColor: Color.SecondaryText }}
      key={job.id}
      title={job.name}
      accessoryTitle={getJobAccessoryTitle(job)}
      accessoryIcon={getJobAccessoryIcon(job)}
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
