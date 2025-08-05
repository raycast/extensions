import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useFetch } from "@raycast/utils";
import { Job } from "./types";
import { formatDate, formatString } from "./utils";
import { useMemo, useState } from "react";
import { TAGS } from "./constants";

export default function JobList() {
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useFetch<Job[]>("https://larajobs.com/api/jobs");

  const jobs = useMemo(() => {
    if (!data) return [];
    if (!filter) return data;
    const [key, val] = filter.split("=");
    return data.filter((job) => {
      if (key === "type") return job.type === val;
      if (key === "tag") return job.tags.find((tag) => tag.name === val);
      if (key === "salary") return !!job.salary;
      return true;
    });
  }, [data, filter]);

  return (
    <List
      searchBarPlaceholder="Filter jobs by title..."
      isLoading={isLoading}
      isShowingDetail={true}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter" onChange={setFilter}>
          <List.Dropdown.Item icon={Icon.Rocket} title="All Jobs" value="" />
          <List.Dropdown.Section title="Type">
            <List.Dropdown.Item icon={Icon.Clock} title="Full Time" value="type=FULL_TIME" />
            <List.Dropdown.Item icon={Icon.Clock} title="Part Time" value="type=PART_TIME" />
            <List.Dropdown.Item icon={Icon.Clock} title="Contract" value="type=CONTRACTOR" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Salary">
            <List.Dropdown.Item icon={Icon.BankNote} title="Salary Mentioned" value="salary=true" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Tags">
            {TAGS.map((tag) => (
              <List.Dropdown.Item key={tag} icon={Icon.Tag} title={tag} value={`tag=${tag}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {jobs.map((job) => (
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
                        <List.Item.Detail.Metadata.TagList.Item key={tag.slug} text={tag.name} />
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
