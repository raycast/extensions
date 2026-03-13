import { useState, useMemo } from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";

import { withQuery, CacheActions } from "@/components";
import { AVATAR_TYPE, PAGINATION_SIZE, QUERY_TYPE } from "@/constants";
import {
  useConfluenceUsersSearchInfiniteQuery,
  useAvatar,
  useConfluenceCurrentUser,
  useRefetchWithToast,
  useFetchNextPageWithToast,
} from "@/hooks";
import { buildQuery, processUserInputAndFilter } from "@/utils";
import type { ProcessedConfluenceUser } from "@/types";

const EMPTY_INFINITE_DATA = { list: [], total: 0 };

export default withQuery(ConfluenceSearchUsers);

function ConfluenceSearchUsers() {
  const [searchText, setSearchText] = useState("");

  useConfluenceCurrentUser();

  const cql = useMemo(() => {
    const trimmedText = searchText.trim();
    if (!trimmedText) return "";

    const processedCQL = processUserInputAndFilter({
      userInput: trimmedText,
      buildClauseFromText: (input) => `user.fullname ~ "${input}" AND type = user`,
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
  }, [searchText]);

  const {
    data = EMPTY_INFINITE_DATA,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isSuccess,
    refetch,
  } = useConfluenceUsersSearchInfiniteQuery(cql, {
    enabled: !!cql,
    meta: { errorMessage: "Failed to Search User" },
  });

  useAvatar<ProcessedConfluenceUser>({
    items: data.list,
    avatarType: AVATAR_TYPE.CONFLUENCE_USER,
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
      pagination={{
        hasMore: hasNextPage,
        onLoadMore: fetchNextPageWithToast,
        pageSize: PAGINATION_SIZE,
      }}
    >
      {isEmpty ? (
        <NoUsersEmptyView cql={cql} />
      ) : (
        <List.Section title={searchTitle}>
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
                    <Action.CopyToClipboard
                      title="Copy Link"
                      content={item.url}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                    />
                    {!!item.userKey && <Action.CopyToClipboard title="Copy User Key" content={item.userKey} />}
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

interface NoUsersEmptyViewProps {
  cql: string;
}

function NoUsersEmptyView({ cql }: NoUsersEmptyViewProps) {
  return (
    <List.EmptyView
      icon={Icon.MagnifyingGlass}
      title="No Results"
      description="Try adjusting your search filters"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy CQL" content={cql} />
        </ActionPanel>
      }
    />
  );
}
