import { useState } from "react";
import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, useCachedState } from "@raycast/utils";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { HistoryEntry } from "./interfaces";
import { DEFAULT_DIA_PROFILE_ID, DIA_PROFILE_KEY } from "./constants";
import DiaProfileDropdown from "./components/DiaProfileDropdown";

function BookmarkActions({ bookmark }: { bookmark: HistoryEntry }) {
  return (
    <ActionPanel>
      <Action.Open title="Open in Dia" target={bookmark.url} application="Dia" />
      <Action.OpenInBrowser url={bookmark.url} />
      <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
      <Action.CopyToClipboard title="Copy Title" content={bookmark.title} />
    </ActionPanel>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>();
  const [profile] = useCachedState<string>(DIA_PROFILE_KEY, DEFAULT_DIA_PROFILE_ID);
  const { data, isLoading, error } = useBookmarkSearch(profile, searchText);

  const emptyTitle = error ? "Unable to load bookmarks" : "No bookmarks found";
  const emptyDescription = error ?? "Your Dia bookmarks will appear here.";

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
      searchBarPlaceholder="Search bookmarks"
      searchBarAccessory={<DiaProfileDropdown />}
    >
      {data?.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          title={bookmark.title || bookmark.url}
          subtitle={bookmark.url}
          icon={getFavicon(bookmark.url)}
          accessories={bookmark.lastVisited ? [{ date: bookmark.lastVisited, tooltip: "Date added" }] : []}
          actions={<BookmarkActions bookmark={bookmark} />}
        />
      ))}

      {!isLoading && (data?.length || 0) === 0 ? (
        <List.EmptyView icon={error ? Icon.Warning : Icon.Bookmark} title={emptyTitle} description={emptyDescription} />
      ) : null}
    </List>
  );
}
