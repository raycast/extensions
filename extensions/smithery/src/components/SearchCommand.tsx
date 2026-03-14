import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import React, { useState } from "react";
import { useSmitheryCheck } from "../hooks/useSmitheryCheck";
import { usePaginatedSearch } from "../hooks/usePaginatedSearch";
import { PaginatedResponse } from "../api/types";

type FetchFn<T> = (params: {
  q: string;
  page: number;
  pageSize: number;
  signal: AbortSignal;
}) => Promise<PaginatedResponse<T>>;

interface SearchCommandStrings {
  searchBarPlaceholder: string;
  emptyTitlePopular: string;
  emptyTitleSearch: string;
  emptyDescriptionPopular: string;
}

type RenderItemFn<T> = (
  item: T,
  isShowingDetail: boolean,
  onToggleDetail: () => void,
) => React.JSX.Element;

interface SearchCommandProps<T> {
  fetchFn: FetchFn<T>;
  rankComparator: (a: T, b: T) => number;
  dedupKey: (item: T) => string;
  errorLabel: string;
  strings: SearchCommandStrings;
  renderItem: RenderItemFn<T>;
}

export function SearchCommand<T>({
  fetchFn,
  rankComparator,
  dedupKey,
  errorLabel,
  strings,
  renderItem,
}: SearchCommandProps<T>) {
  const { isLoading, error, retry } = useSmitheryCheck();
  const [isShowingDetail, setIsShowingDetail] = useState(true);

  const {
    items,
    isFetching,
    loadError,
    isPopularMode,
    query,
    setSearchText,
    pagination,
    refresh,
  } = usePaginatedSearch<T>({
    fetchFn,
    rankComparator,
    dedupKey,
    errorLabel,
  });

  const toggleDetail = () => setIsShowingDetail((previous) => !previous);

  if (error) {
    return (
      <Detail
        markdown={`# Smithery CLI Required\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={retry}
              icon={Icon.RotateClockwise}
            />
            <Action.OpenInBrowser
              title="Install Smithery CLI"
              url="https://smithery.ai/"
              icon={Icon.Download}
            />
          </ActionPanel>
        }
      />
    );
  }

  if (loadError && items.length === 0) {
    return (
      <Detail
        markdown={`# API Error\n\n${loadError.message}`}
        actions={
          <ActionPanel>
            <Action
              title="Retry"
              onAction={refresh}
              icon={Icon.RotateClockwise}
            />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List
      searchBarPlaceholder={strings.searchBarPlaceholder}
      throttle
      isLoading={isLoading || isFetching}
      onSearchTextChange={setSearchText}
      isShowingDetail={items.length > 0 && isShowingDetail}
      pagination={pagination}
    >
      {items.length === 0 && !isFetching ? (
        <List.EmptyView
          title={
            isPopularMode ? strings.emptyTitlePopular : strings.emptyTitleSearch
          }
          description={
            isPopularMode
              ? strings.emptyDescriptionPopular
              : `No results for "${query}".`
          }
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        <List.Section
          title={
            isPopularMode ? "Popular on Smithery" : `Results for "${query}"`
          }
          subtitle={`${items.length} loaded`}
        >
          {items.map((item) => renderItem(item, isShowingDetail, toggleDetail))}
        </List.Section>
      )}
    </List>
  );
}
