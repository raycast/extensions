import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { api } from "./api";
import { isHttpUrl, type BookmarkPage } from "./client";
import { ConnectionActions } from "./connection-actions";

export default function SearchBookmarks() {
  const [search, setSearch] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const { data, error, isLoading, pagination, revalidate } = usePromise(
    (q: string) =>
      async ({ page }: { page: number }) => {
        const params = new URLSearchParams({
          q,
          page: String(page),
          perPage: "50",
        });
        const result = await api<BookmarkPage>(`/bookmarks?${params}`, {
          signal: abortable.current?.signal,
        });
        return { data: result.bookmarks, hasMore: result.hasMore };
      },
    [search],
    { abortable },
  );
  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle
      searchBarPlaceholder="Search your Linqlo bookmarks…"
      onSearchTextChange={setSearch}
      pagination={pagination}
    >
      <List.EmptyView
        title={error ? "Could Not Load Bookmarks" : "No Bookmarks Found"}
        description={error?.message ?? "Save a link or try a different search."}
        actions={
          <ActionPanel>
            <ConnectionActions retry={revalidate} />
          </ActionPanel>
        }
      />
      {data?.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          title={bookmark.title || bookmark.url}
          subtitle={bookmark.domain || undefined}
          icon={Icon.Bookmark}
          accessories={bookmark.tags.slice(0, 2).map((tag) => ({ tag }))}
          actions={
            <ActionPanel>
              {isHttpUrl(bookmark.url) && (
                <Action.OpenInBrowser url={bookmark.url} />
              )}
              <Action.CopyToClipboard
                title="Copy URL"
                content={bookmark.url}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
              <ConnectionActions retry={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
