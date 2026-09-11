import { useState, useMemo } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { SearchFilter, withQuery, CacheActions } from "@/components";
import { AVATAR_TYPE, COMMAND_NAME, PAGINATION_SIZE, QUERY_TYPE, CONFLUENCE_SEARCH_CONTENT_FILTERS } from "@/constants";
import {
  useConfluenceContentsSearchInfiniteQuery,
  useToggleConfluenceContentFavorite,
  useAvatar,
  useConfluenceCurrentUser,
  useRefetchWithToast,
  useFetchNextPageWithToast,
} from "@/hooks";
import {
  getSectionTitle,
  processUserInputAndFilter,
  buildQuery,
  copyToClipboardWithToast,
  replaceQueryCurrentUser,
  isCQL,
} from "@/utils";
import type { ProcessedConfluenceContent, SearchFilter as SelectedFilter } from "@/types";

const EMPTY_INFINITE_DATA = { list: [], total: 0 };
const DEFAULT_FILTER = CONFLUENCE_SEARCH_CONTENT_FILTERS.find((item) => item.value === "updated_recently");

export default withQuery(ConfluenceSearchContents);

function ConfluenceSearchContents() {
  const [searchText, setSearchText] = useState("");
  const [filter, setFilter] = useState<SelectedFilter | null>(null);

  const { cql, filterForQuery } = useMemo(() => {
    const trimmedText = searchText.trim();
    let filterForQuery: SelectedFilter | null | undefined = filter;

    // If input is too short and filter is not auto-query, treat it as no input
    if (trimmedText.length < 2 && filter && !filter.autoQuery) {
      return { cql: "", filterForQuery };
    }

    // If no input and "All Contents" is selected, show recently viewed by default
    const withoutUserInputAndFilter = !trimmedText && !filter;
    filterForQuery = withoutUserInputAndFilter ? DEFAULT_FILTER : filter;

    // If input is a CQL, ignore filter constraint
    const isCQLUserInput = isCQL(trimmedText);
    if (isCQLUserInput && filter) {
      filterForQuery = undefined;
    }

    const processedCQL = processUserInputAndFilter({
      userInput: trimmedText,
      filter: filterForQuery,
      buildClauseFromText: (input) => `title ~ "${input}"`,
      queryType: QUERY_TYPE.CQL,
    });

    if (typeof processedCQL === "string") {
      return { cql: processedCQL, filterForQuery };
    }

    const finalCQL = buildQuery({
      ...processedCQL,
      orderBy: processedCQL.orderBy || "lastmodified DESC, created DESC",
      queryType: QUERY_TYPE.CQL,
    });

    return { cql: finalCQL, filterForQuery };
  }, [searchText, filter]);

  const {
    data = EMPTY_INFINITE_DATA,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isSuccess,
    refetch,
  } = useConfluenceContentsSearchInfiniteQuery(cql, {
    enabled: !!cql,
    meta: { errorMessage: "Failed to Search Content" },
  });

  const { currentUser } = useConfluenceCurrentUser();

  const toggleFavorite = useToggleConfluenceContentFavorite();

  useAvatar<ProcessedConfluenceContent>({
    items: data.list,
    avatarType: AVATAR_TYPE.CONFLUENCE_USER,
    collectAvatars: (items) =>
      items
        .filter((item) => item.creatorAvatarUrl && item.creatorAvatarCacheKey)
        .map((item) => ({ url: item.creatorAvatarUrl, key: item.creatorAvatarCacheKey! })),
  });

  const refetchWithToast = useRefetchWithToast({ refetch });

  const fetchNextPageWithToast = useFetchNextPageWithToast({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const isEmpty = isSuccess && !data.list.length;

  const sectionTitle = getSectionTitle(filterForQuery, {
    fetchedCount: data.list.length,
    totalCount: data?.total || 0,
  });

  const handleToggleFavorite = (contentId: string, isFavorited: boolean) => {
    toggleFavorite.mutate({ contentId, isFavorited });
  };

  const copyCQL = () => {
    let replacedCQL = cql;

    if (currentUser?.username) {
      replacedCQL = replaceQueryCurrentUser(replacedCQL, currentUser.username);
    }

    copyToClipboardWithToast(replacedCQL);
  };

  return (
    <List
      throttle
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by title..."
      searchBarAccessory={
        <SearchFilter
          commandName={COMMAND_NAME.CONFLUENCE_SEARCH_CONTENT}
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
        <NoContentsEmptyView cql={cql} />
      ) : (
        <List.Section title={sectionTitle}>
          {data.list.map((item) => {
            return (
              <List.Item
                key={item.renderKey}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                accessories={item.accessories}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser title="Open in Browser" url={item.url} />
                    {item.canEdit && (
                      <Action.OpenInBrowser
                        icon={Icon.Pencil}
                        title="Edit in Browser"
                        url={item.editUrl}
                        shortcut={{ modifiers: ["cmd"], key: "e" }}
                      />
                    )}
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={item.url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {item.canFavorite && (
                      <Action
                        icon={item.isFavourited ? Icon.StarDisabled : Icon.Star}
                        title={item.isFavourited ? "Remove from Favourites" : "Add to Favourites"}
                        onAction={() => handleToggleFavorite(item.id, item.isFavourited)}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                      />
                    )}
                    {item.spaceUrl && (
                      <Action.OpenInBrowser
                        icon={Icon.House}
                        title={`Open Space Homepage${item.spaceName ? ` (${item.spaceName})` : ""}`}
                        url={item.spaceUrl}
                      />
                    )}
                    {cql && <Action title="Copy CQL" icon={Icon.CopyClipboard} onAction={() => copyCQL()} />}
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

interface NoContentsEmptyViewProps {
  cql: string;
}

function NoContentsEmptyView({ cql }: NoContentsEmptyViewProps) {
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
          <Action.CopyToClipboard title="Copy CQL" content={cql} />
        </ActionPanel>
      }
    />
  );
}
