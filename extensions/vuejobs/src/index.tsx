import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Response, WorkType, Jobs } from "./types";
import { useState } from "react";

export default function Command() {
  const [selectedWorkType, setSelectedWorkType] = useState("");

  const { data, isLoading } = useFetch<Response>(
    `https://app.vuejobs.com/posts/items?filter[taxonomy.work_type]=${selectedWorkType}&limit=-1`,
    {
      headers: { Accept: "application/json" },
    }
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  type SectionKey = "today" | "yesterday" | "earlier";

  const initialSections: Record<SectionKey, Jobs[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  const sections = data?.data.reduce<Record<SectionKey, Jobs[]>>((acc, job) => {
    const jobDate = new Date(job.published_at);
    jobDate.setHours(0, 0, 0, 0);

    if (+jobDate === +today) {
      acc.today.push(job);
    } else if (+jobDate === +yesterday) {
      acc.yesterday.push(job);
    } else {
      acc.earlier.push(job);
    }

    return acc;
  }, initialSections);

  const workTypeData: WorkType = [
    {
      value: "",
      name: "All",
    },
    {
      value: "full-time",
      name: "Full Time",
    },
    {
      value: "part-time",
      name: "Part Time",
    },
    {
      value: "contract",
      name: "Contract",
    },
    {
      value: "freelance",
      name: "Freelance",
    },
    {
      value: "internship",
      name: "Internship",
    },
  ];

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Page"
          defaultValue={workTypeData[0].value}
          storeValue
          onChange={(newValue) => setSelectedWorkType(newValue)}
        >
          {workTypeData.map((type) => (
            <List.Dropdown.Item key={type.name} title={type.name} value={type.value} />
          ))}
        </List.Dropdown>
      }
      isShowingDetail
    >
      {(["today", "yesterday", "earlier"] as SectionKey[]).map((section) => (
        <List.Section title={section.charAt(0).toUpperCase() + section.slice(1)} key={section}>
          {sections &&
            sections[section].map((job) => (
              <List.Item
                key={job["slug"]}
                icon={job.organization.avatar || "../assets/vuejobs.png"}
                title={job.title}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser url={`https://vuejobs.com/jobs/${job.slug}`} />
                  </ActionPanel>
                }
                accessories={[
                  {
                    text:
                      new Date(job.published_at).toLocaleDateString() === new Date().toLocaleDateString() ||
                      new Date(job.published_at).toLocaleDateString() === yesterday.toLocaleDateString()
                        ? "🔥"
                        : "",
                  },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${job.organization.name} \n<img src="${
                      job.organization.avatar || "../assets/vuejobs.png"
                    }" height="70" />`}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Date Psted"
                          text={new Date(job.published_at).toDateString()}
                        />

                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Job Title"
                          text={job.title}
                          icon={job.organization.avatar || "../assets/vuejobs.png"}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Company" text={`@${job.organization.name}`} />
                        <List.Item.Detail.Metadata.Separator />

                        <List.Item.Detail.Metadata.TagList title="Work level">
                          <List.Item.Detail.Metadata.TagList.Item
                            text={job.taxonomies.work_level.map((level) => level).join("- ")}
                            color={"#eed535"}
                          />
                        </List.Item.Detail.Metadata.TagList>

                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Location" icon="📍" />

                        <List.Item.Detail.Metadata.TagList title="Country">
                          {job.locations.length > 0 ? (
                            job.locations.map((location, index) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={location.country.name + index}
                                text={location.country.name}
                                color={"#eed535"}
                              />
                            ))
                          ) : (
                            <List.Item.Detail.Metadata.TagList.Item text="Not Specified" color={"#717171"} />
                          )}
                        </List.Item.Detail.Metadata.TagList>
                        <List.Item.Detail.Metadata.Label
                          title="Work Location"
                          text={
                            job.remote.type === "ONLY"
                              ? " Remote"
                              : job.remote.type === "ALLOWED"
                              ? " Remote Allowed"
                              : job.remote.type === "HYBRID"
                              ? " Hybrid"
                              : job.remote.type === null
                              ? " Onsite"
                              : " Onsite"
                          }
                          icon="🏢"
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Work type"
                          icon="../assets/vuejobs.png"
                          text={job.taxonomies.work_type.map((type) => type).join("- ")}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Salary" icon="💰" />
                        <List.Item.Detail.Metadata.Label
                          title="Interval"
                          text={job.salary.interval !== null ? job.salary.interval : "Not Defined"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="From"
                          text={job.salary.from !== null ? job.salary.from.toString() : "Not Defined"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="to"
                          text={job.salary.to !== null ? job.salary.to.toString() : "Not Defined"}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Currency"
                          text={job.salary.currency !== null ? job.salary.currency : "Not Defined"}
                        />
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
              />
            ))}
        </List.Section>
      ))}
    </List>
  );
}
