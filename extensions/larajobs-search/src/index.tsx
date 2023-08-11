import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import axios from "axios";

interface Tag {
  name: string;
  slug: string;
}

interface Job {
  id: number;
  organization: string;
  title: string;
  location: string;
  type: string;
  url: string;
  salary?: string;
  published_at: string;
  tags: Array<Tag>;
}

export default function JobList() {
  const { data: jobs, error } = useFetch<Job[]>("https://larajobs.com/api/jobs");

  if (error) {
    return <List isLoading={false} searchBarPlaceholder="Failed to load jobs."></List>;
  }

  if (!jobs) {
    return <List isLoading={true} searchBarPlaceholder="Loading jobs..."></List>;
  }

  return (
    <List searchBarPlaceholder="Filter jobs by title...">
      {jobs.map((job) => (
        <List.Item
          key={job.id}
          title={job.title}
          icon={getFavicon(job.url)}
          subtitle={job.salary ?? `No salary info`}
          accessories={[{ text: { value: job.organization }, icon: Icon.BankNote }]}
          actions={
            <ActionPanel title={job.title}>
              <Action.OpenInBrowser url={job.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
