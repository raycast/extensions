import { ActionPanel, Action, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { useFetch } from "@raycast/utils";
import { AbsenceRecord, AbsencesResponse } from "./types";
import { getEmployeeFullname, getSubtitleText } from "./utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [filteredList, filterList] = useState<AbsenceRecord[]>([]);

  const { accessToken, subdomain } = getPreferenceValues();
  const { isLoading, data } = useFetch<AbsencesResponse>(
    `https://${subdomain}.sage.hr/api/leave-management/out-of-office-today`,
    {
      headers: {
        "X-Auth-Token": accessToken,
      },
    },
  );

  useEffect(() => {
    const fullList = data?.data;
    if (!fullList) {
      return;
    }
    const newLists = fullList.filter((item) => {
      const fullNameLowered = getEmployeeFullname(item.employee).toLowerCase();
      const searchTextLowered = searchText.toLowerCase();
      return fullNameLowered.includes(searchTextLowered);
    });
    filterList(newLists);
  }, [searchText, data]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      searchBarPlaceholder="Enter the name"
      onSearchTextChange={setSearchText}
    >
      {filteredList.map((item) => {
        const fullName = getEmployeeFullname(item.employee);
        const copyContent = item.employee.email || fullName;
        return (
          <List.Item
            key={item.employee_id}
            title={fullName}
            subtitle={getSubtitleText({
              startDate: item.start_date,
              endDate: item.end_date,
              policyName: item.policy.name,
            })}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={copyContent} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
