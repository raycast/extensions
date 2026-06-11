import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";

import { getFilters } from "./api/filters";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function MyFilters() {
  const [query, setQuery] = useState("");
  const [filterId, setFilterId] = useCachedState("filter-id", "");

  const { data: filters, isLoading: isLoadingFilters } = useCachedPromise((query) => getFilters(query), [query], {
    keepPreviousData: true,
  });

  const jql = useMemo(() => filters?.find((filter) => filter.id === filterId)?.jql ?? "", [filters, filterId]);

  const { issues, isLoading, mutate } = useIssues(jql, { execute: !!jql });

  const searchBarAccessory = filters ? (
    <List.Dropdown
      tooltip="Filter issues by filters"
      onChange={setFilterId}
      value={filterId}
      isLoading={isLoadingFilters}
      onSearchTextChange={setQuery}
      throttle
    >
      {filters?.map((filter) => {
        return <List.Dropdown.Item key={filter.id} title={filter.name ?? "Unknown filter name"} value={filter.id} />;
      })}
    </List.Dropdown>
  ) : null;

  return (
    <StatusIssueList
      issues={issues}
      isLoading={isLoading || isLoadingFilters}
      mutate={mutate}
      searchBarAccessory={searchBarAccessory}
    />
  );
}

export default withJiraCredentials(MyFilters);
