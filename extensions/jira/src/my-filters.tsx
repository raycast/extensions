import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";

import { getFilters } from "./api/filters";
import { getIssues } from "./api/issues";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";

export function MyFilters() {
  const { data: filters } = useCachedPromise(() => getFilters());

  const [filterId, setFilterId] = useState("");

  const {
    data: issues,
    isLoading,
    mutate,
  } = useCachedPromise(
    (filterId) => {
      const jql = filters?.find((filter) => filter.id === filterId)?.jql;
      if (!jql) {
        return Promise.resolve([]);
      }

      return getIssues({ jql });
    },
    [filterId],
    { execute: filterId !== "" }
  );

  const searchBarAccessory = filters ? (
    <List.Dropdown tooltip="Filter issues by filters" onChange={setFilterId} storeValue>
      {filters?.map((filter) => {
        return <List.Dropdown.Item key={filter.id} title={filter.name} value={filter.id} />;
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
