import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getFilters } from "./api/filters";
import { getIssues } from "./api/issues";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export function MyFilters() {
  const { data: filters } = useCachedPromise(() => getFilters());

  const [filterJql, setFilterJql] = useState("");

  const {
    data: issues,
    isLoading,
    mutate,
  } = useCachedPromise((jql) => getIssues({ jql }), [filterJql], { execute: filterJql !== "" });

  const searchBarAccessory = filters ? (
    <List.Dropdown tooltip="Filter issues by filters" onChange={setFilterJql} storeValue>
      {filters?.map((filter) => {
        return <List.Dropdown.Item key={filter.id} title={filter.name} value={filter.jql} />;
      })}
    </List.Dropdown>
  ) : null;

  return (
    <StatusIssueList issues={issues} isLoading={isLoading} mutate={mutate} searchBarAccessory={searchBarAccessory} />
  );
}

export default function Command() {
  return withJiraCredentials(<MyFilters />);
}
