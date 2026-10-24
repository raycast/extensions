import { Icon, LaunchProps, List } from "@raycast/api";
import { useMemo, useState } from "react";

import { CommentListItem } from "./components/CommentListItem";
import { ErrorDetail } from "./components/ErrorDetail";
import {
  LOAD_MORE_ITEM_ID,
  LoadMoreListItem,
} from "./components/LoadMoreListItem";
import { PAGE_SIZE } from "./constants";
import { getSearchCommentPreferences } from "./preferences";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useSearchComments } from "./hooks/useGreptile";

const SEARCH_DEBOUNCE_MS = 350;

export default function Command(
  props: LaunchProps<{ arguments: Arguments.SearchComments }>,
) {
  const [query, setQuery] = useState(props.arguments.query ?? "");
  const preferences = getSearchCommentPreferences();
  const trimmedQuery = query.trim();
  const debouncedQuery = useDebouncedValue(trimmedQuery, SEARCH_DEBOUNCE_MS);
  const hasQuery = debouncedQuery.length > 0;
  const hasSearchText = trimmedQuery.length > 0;
  const isDebouncing = hasSearchText && trimmedQuery !== debouncedQuery;
  const input = useMemo(
    () => ({
      query: debouncedQuery,
      includeAddressed: Boolean(preferences.includeAddressed),
      limit: PAGE_SIZE,
    }),
    [debouncedQuery, preferences.includeAddressed],
  );
  const { comments, error, hasMore, isLoading, isLoadingMore, loadMore } =
    useSearchComments(input, hasQuery);

  if (error) {
    return <ErrorDetail error={error} />;
  }

  return (
    <List
      isLoading={hasSearchText && (isDebouncing || isLoading)}
      navigationTitle="Search Comments"
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Greptile review comments"
      onSelectionChange={(id) => {
        if (id === LOAD_MORE_ITEM_ID) {
          loadMore();
        }
      }}
    >
      {!hasSearchText ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Greptile Comments"
          description="Enter a security, performance, style, file, or feature term."
        />
      ) : (
        <List.Section title="Comments" subtitle={formatLoaded(comments.length)}>
          {comments.map((comment) => (
            <CommentListItem key={comment.id} comment={comment} />
          ))}
          {hasMore ? (
            <LoadMoreListItem isLoading={isLoadingMore} onLoadMore={loadMore} />
          ) : null}
        </List.Section>
      )}
    </List>
  );
}

function formatLoaded(visible: number) {
  return `${visible} loaded`;
}
