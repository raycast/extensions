import { useState, useMemo } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { processUserInputAndFilter, buildQuery, isJQL } from "@/utils";
import type { ProcessedConfluenceSpace } from "@/types";
import { QUERY_TYPE, AVATAR_TYPE, COMMAND_NAME, PAGINATION_SIZE } from "@/constants";
import { SearchFilter, withQuery, CacheActions } from "@/components";
import {
  useConfluenceSpacesSearchInfiniteQuery,
  useAvatar,
  useRefetchWithToast,
  useFetchNextPageWithToast,
} from "@/hooks";
import type { SearchFilter as SelectedFilter } from "@/types";

const EMPTY_INFINITE_DATA = { list: [], total: 0 };

export default withQuery(ConfluenceSearchSpaces);

function ConfluenceSearchSpaces() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<SelectedFilter | null>(null);

  const cql = useMemo(() => {
    const trimmedText = searchText.trim();
    let filterForQuery: SelectedFilter | null | undefined = filter;

    if (!trimmedText && !filter?.autoQuery) {
      return "";
    }

    const isJQLUserInput = isJQL(trimmedText);
    if (isJQLUserInput && filter) {
      filterForQuery = undefined;
    }

    const processedCQL = processUserInputAndFilter({
      userInput: trimmedText,
      filter: filterForQuery,
      buildClauseFromText: (input) => `type = space AND space.title ~ "${input}"`,
      queryType: QUERY_TYPE.CQL,
    });

    if (typeof processedCQL === "string") {
      return processedCQL;
    }

    return buildQuery({
      ...processedCQL,
      orderBy: processedCQL.orderBy || "lastmodified DESC, created DESC",
      queryType: QUERY_TYPE.CQL,
    });
  }, [searchText, filter]);

  const {
    data = EMPTY_INFINITE_DATA,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isSuccess,
    refetch,
  } = useConfluenceSpacesSearchInfiniteQuery(cql, {
    enabled: !!cql,
    meta: { errorMessage: "Failed to Search Space" },
  });

  useAvatar<ProcessedConfluenceSpace>({
    items: data.list,
    avatarType: AVATAR_TYPE.CONFLUENCE_SPACE,
    collectAvatars: (items) =>
      items
        .filter((item) => item.avatarUrl && item.avatarCacheKey)
        .map((item) => ({ url: item.avatarUrl, key: item.avatarCacheKey! })),
  });

  const refetchWithToast = useRefetchWithToast({ refetch });

  const fetchNextPageWithToast = useFetchNextPageWithToast({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const isEmpty = isSuccess && !data.list.length;

  const searchTitle = `Results (${data.list.length}/${data?.total})`;

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by name..."
      searchBarAccessory={
        <SearchFilter
          commandName={COMMAND_NAME.CONFLUENCE_SEARCH_SPACE}
          value={filter?.value || ""}
          onChange={setFilter}
        />
      }
      pagination={{
        hasMore: hasNextPage,
        onLoadMore: fetchNextPageWithToast,
        pageSize: PAGINATION_SIZE,
      }}
    >
      {isEmpty ? (
        <NoSpacesEmptyView cql={cql} />
      ) : (
        <List.Section title={searchTitle}>
          {data.list.map((item) => {
            return (
              <List.Item
                key={item.renderKey}
                icon={item.icon}
                title={item.name}
                subtitle={item.subtitle}
                accessories={item.accessories}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={item.url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    <Action.CopyToClipboard title="Copy Space Key" content={item.key} />
                    {cql && <Action.CopyToClipboard title="Copy CQL" content={cql} />}
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={refetchWithToast}
                    />
                    <CacheActions />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

interface NoSpacesEmptyViewProps {
  cql: string;
}

function NoSpacesEmptyView({ cql }: NoSpacesEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Results"
      description="Try adjusting your search filters or check your CQL syntax"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={Icon.Book}
            title="Open CQL Documentation"
            url="https://developer.atlassian.com/server/confluence/rest/v1010/intro/#advanced-searching-using-cql"
          />
          {cql && <Action.CopyToClipboard title="Copy CQL" content={cql} />}
        </ActionPanel>
      }
    />
  );
}
