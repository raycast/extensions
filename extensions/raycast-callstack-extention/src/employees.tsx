import { ActionPanel, List, Action, getPreferenceValues, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import DeveloperRelatedNotes from "./Components/DeveloperRelatedNotes";
import EmployeeProjects from "./Components/EmployeeProjects";
import EmployeeRelatedEvents from "./Components/EmployeeRelatedEvents";

import { mapRoleToColor } from "./utils/constants";
import { isProbationEndInFuture } from "./utils/isProbationEndInFuture";
import { Employee, fetchDeveloperOkrs, fetchEmployees } from "./services/notion";

export default function Command() {
  const preferences = getPreferenceValues();

  const [search, setSearch] = useState<string>("");

  const { isLoading, data } = useCachedPromise(
    async (text: string) => {
      const employees = await fetchEmployees(text, preferences.NotionKey);

      const promises = employees?.map((employee) => fetchAdditionalDeveloperData(employee, preferences.NotionKey));
      const allDevelopersData = await Promise.all(promises);

      return allDevelopersData;
    },
    [search],
    { keepPreviousData: true }
  );

  return (
    <List searchText={search} onSearchTextChange={setSearch} isShowingDetail isLoading={isLoading} throttle>
      {(data || []).map((item) => (
        <List.Item
          key={item.id}
          icon="notion-logo.png"
          title={item.name || ""}
          subtitle={item.seniority?.join(" | ")}
          actions={
            <ActionPanel>
              {item.developerOKRs?.competencyMapUrl ? (
                <Action.OpenInBrowser
                  icon={Icon.Map}
                  title="Competency Map"
                  shortcut={{ modifiers: ["cmd"], key: "m" }}
                  url={item.developerOKRs?.competencyMapUrl}
                />
              ) : null}
              {item.developerOKRs?.okrsPageUrl ? (
                <Action.Open
                  icon="notion-logo.png"
                  title="OKRs"
                  shortcut={{ modifiers: ["cmd"], key: "o" }}
                  target={item.developerOKRs?.okrsPageUrl.replace("https", "notion")}
                />
              ) : null}
              {item.developerOKRs?.id ? (
                <Action.Push
                  icon={Icon.Book}
                  title="Notes"
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<DeveloperRelatedNotes developerId={item.developerOKRs?.id} />}
                />
              ) : null}
              {item.name ? (
                <Action.Push
                  icon={Icon.MagnifyingGlass}
                  title="Assignments"
                  shortcut={{ modifiers: ["cmd"], key: "p" }}
                  target={<EmployeeProjects developerName={item.name} />}
                />
              ) : null}
              {item.name ? (
                <Action.Push
                  icon={Icon.Calendar}
                  title="Events"
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                  target={<EmployeeRelatedEvents name={item.name} />}
                />
              ) : null}
            </ActionPanel>
          }
          detail={
            <List.Item.Detail
              markdown={item.developerOKRs?.photoUrl ? `![Illustration](${item.developerOKRs?.photoUrl})` : null}
              metadata={
                <List.Item.Detail.Metadata>
                  {item.seniority ? (
                    <List.Item.Detail.Metadata.TagList title="Seniority / Role">
                      {item.seniority.map((seniority) => (
                        <List.Item.Detail.Metadata.TagList.Item
                          text={seniority}
                          color={mapRoleToColor(seniority)}
                          key={seniority}
                        />
                      ))}
                    </List.Item.Detail.Metadata.TagList>
                  ) : null}
                  {item.domain ? <List.Item.Detail.Metadata.Label title="Domain" text={item.domain} /> : null}
                  {item.hrbp ? <List.Item.Detail.Metadata.Label title="HRBP" text={item.hrbp} /> : null}
                  {item.country ? <List.Item.Detail.Metadata.Label title="Country/city" text={item.country} /> : null}
                  <List.Item.Detail.Metadata.Separator />
                  {item.developerOKRs?.startDate ? (
                    <List.Item.Detail.Metadata.Label
                      title="Start date"
                      text={item.developerOKRs?.startDate.toLocaleDateString()}
                    />
                  ) : null}
                  {item.developerOKRs?.probationEndDate &&
                  isProbationEndInFuture(item.developerOKRs?.probationEndDate) ? (
                    <List.Item.Detail.Metadata.Label
                      title="Probation end date"
                      text={item.developerOKRs?.probationEndDate.toLocaleDateString()}
                    />
                  ) : null}
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

async function fetchAdditionalDeveloperData(employee: Employee, notionToken: string): Promise<Employee> {
  const nameReversed = employee.name?.split(" ").reverse().join(" ") || "";

  const developerOKRs = await fetchDeveloperOkrs(nameReversed, notionToken);

  return {
    ...employee,
    developerOKRs: developerOKRs,
  };
}
