import { Action, ActionPanel, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Job } from "./types";
import { formatDate, formatString } from "./utils";

export default function JobList() {
  const { data: jobs, isLoading } = useFetch<Job[]>("https://larajobs.com/api/jobs");

  return (
    <List searchBarPlaceholder="Filter jobs by title..." isLoading={isLoading} isShowingDetail={true}>
      {jobs &&
        jobs.map((job) => (
          <List.Item
            key={job.id}
            title={job.title}
            icon={getFavicon(job.url)}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Position" text={job.title} />
                    <List.Item.Detail.Metadata.Label title="Company" text={job.organization} />
                    <List.Item.Detail.Metadata.Label title="Type" text={formatString(job.type)} />
                    <List.Item.Detail.Metadata.Label title="Salary" text={job.salary ?? `No salary info`} />
                    {job.tags.length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Skills">
                        {job.tags.map((tag) => (
                          <List.Item.Detail.Metadata.TagList.Item text={tag.name} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Label title="Published" text={formatDate(job.published_at)} />
                  </List.Item.Detail.Metadata>
                }
              />
            }
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
