import { ActionPanel, List, Action } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Response, WorkType } from "./types";
import { useState } from "react";

export default function Command() {
  const [selectedWorkType, setSelectedWorkType] = useState("");

  const { data, isLoading } = useFetch<Response>(
    `https://app.vuejobs.com/posts/items?filter[taxonomy.work_type]=${selectedWorkType}&limit=-1`,
    {
      headers: { Accept: "application/json" },
    }
  );

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
      {data?.data.map((job) => {
        const accessories = [{}];
        return (
          <List.Item
            key={job.slug}
            icon={job.organization.avatar}
            title={job.title}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={`https://vuejobs.com/jobs/${job.slug}`} />
              </ActionPanel>
            }
            accessories={accessories}
            detail={
              <List.Item.Detail
                markdown={`## ${job.organization.name} \n<img src="${job.organization.avatar}" height="70" />`}
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
                      icon={job.organization.avatar}
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
                      icon="👨‍💻"
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
        );
      })}
    </List>
  );
}
