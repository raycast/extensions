import { List } from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { useState } from "react";

import { Filter, getFilters } from "./api/filters";
import StatusIssueList from "./components/StatusIssueList";
import { withJiraCredentials } from "./helpers/withJiraCredentials";
import useIssues from "./hooks/useIssues";

export function MyFilters() {
  const [cachedFilter, setCachedFilter] = useCachedState<Filter>("filter");
  const [filterQuery, setFilterQuery] = useState("");
  const { data: filters, isLoading: isLoadingFilters } = useCachedPromise((query) => getFilters(query), [filterQuery], {
    keepPreviousData: true,
  });

  const isSearching = filterQuery !== "";

  const { issues, isLoading, mutate } = useIssues(cachedFilter?.jql ?? "", {
    execute: cachedFilter && cachedFilter.jql !== "" && !isSearching,
  });

  const searchBarAccessory = filters ? (
    <List.Dropdown
      tooltip="Filter issues by filters"
      onChange={(id) => {
        setFilterQuery("");
        setCachedFilter(filters.find((f) => f.id === id));
      }}
      value={cachedFilter?.id ?? ""}
      isLoading={isLoadingFilters}
      onSearchTextChange={setFilterQuery}
      throttle
    >
      {cachedFilter && !isSearching ? (
        <List.Dropdown.Item key={cachedFilter.id} title={cachedFilter.name} value={cachedFilter.id} />
      ) : null}
      {filters
        ?.filter((filter) => (cachedFilter && !isSearching ? filter.id !== cachedFilter?.id : true))
        ?.map((filter) => {
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
