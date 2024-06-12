import { List } from "@raycast/api";
import { useState } from "react";

import { useSearch } from "./useSearch";
import { SearchListItem } from "./components/SearchResultItem";
import { messaging } from "./messaging";
import { EmptyState } from "./components/states/EmptyState";
import { LoadingState } from "./components/states/LoadingState";

function Command() {
  const [query, setQuery] = useState("");
  const { data, isLoading, pagination } = useSearch(query);

  const isLoadingFirstSearch = isLoading && data.length === 0;
  const hasSearchQuery = query.length > 0;

  return (
    <List
      isShowingDetail
      isLoading={hasSearchQuery && isLoading}
      pagination={pagination}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={messaging.SEARCH_PLACEHOLDER}
      throttle
    >
      {!hasSearchQuery ? (
        <EmptyState />
      ) : isLoadingFirstSearch ? (
        <LoadingState />
      ) : (
        <List.Section title={messaging.RESULTS_TITLE} subtitle={data.length + ""}>
          {data.map((searchResult) => (
            <SearchListItem key={searchResult.id} {...searchResult} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default Command;
