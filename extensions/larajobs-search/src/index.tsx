import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Job } from "./types";

export default function JobList() {
  const { data: jobs, isLoading } = useFetch<Job[]>("https://larajobs.com/api/jobs");

  return (
    <List searchBarPlaceholder="Filter jobs by title..." isLoading={isLoading}>
      {jobs &&
        jobs.map((job) => (
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
