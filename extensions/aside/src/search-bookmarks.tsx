import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { getFavicon, useFrecencySorting, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { OpenBookmarkAction, OpenInDefaultBrowserAction, RefreshAction, UrlActions } from "./components/actions";
import { ProfileDropdown } from "./components/profile-dropdown";
import { getBookmarks } from "./lib/bookmarks";
import { useAsideProfiles } from "./lib/profiles";
import { filterSearchable } from "./lib/search";

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");
  const { profile: configuredProfile } = getPreferenceValues<Preferences.SearchBookmarks>();
  const { profile, setProfile, profiles, isLoading: isLoadingProfiles } = useAsideProfiles(configuredProfile);
  const { data, isLoading, error, revalidate } = usePromise(getBookmarks, [profile], {
    onError(err) {
      showToast({ style: Toast.Style.Failure, title: "Could not read bookmarks", message: err.message });
    },
  });

  const {
    data: sortedBookmarks,
    visitItem,
    resetRanking,
  } = useFrecencySorting(data ?? [], {
    namespace: "aside-bookmarks",
    key: (bookmark) => bookmark.id,
  });
  const bookmarksJson = useMemo(
    () =>
      JSON.stringify(
        (data ?? []).map(({ title, url, folder }) => ({
          title: title || url,
          url,
          folder: folder || null,
        })),
        null,
        2,
      ),
    [data],
  );
  const filteredBookmarks = filterSearchable(sortedBookmarks, searchText, (bookmark) => bookmark.folder);

  return (
    <List
      isLoading={isLoading || isLoadingProfiles}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Aside bookmarks…"
      searchBarAccessory={<ProfileDropdown profiles={profiles} value={profile} onChange={setProfile} />}
      filtering={false}
    >
      {error && !isLoading ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Failed to Load Bookmarks"
          description={error.message}
          actions={
            <ActionPanel>
              <RefreshAction subject="Bookmarks" revalidate={revalidate} />
            </ActionPanel>
          }
        />
      ) : filteredBookmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks Found"
          description={searchText ? "No bookmarks match your search." : "Bookmark a page in Aside to see it here."}
        />
      ) : (
        filteredBookmarks.map((bookmark) => (
          <List.Item
            key={bookmark.id}
            icon={getFavicon(bookmark.url, { fallback: Icon.Bookmark })}
            title={bookmark.title || bookmark.url}
            subtitle={bookmark.url}
            accessories={bookmark.folder ? [{ icon: Icon.Folder, text: bookmark.folder }] : undefined}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <OpenBookmarkAction bookmark={bookmark} onOpen={() => visitItem(bookmark)} />
                  <OpenInDefaultBrowserAction url={bookmark.url} onOpen={() => visitItem(bookmark)} />
                </ActionPanel.Section>
                <UrlActions url={bookmark.url} title={bookmark.title || bookmark.url} />
                <ActionPanel.Section title="Bookmark">
                  <Action.CopyToClipboard
                    title="Copy Bookmarks as JSON"
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    content={bookmarksJson}
                  />
                  <Action
                    title="Reset Ranking"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={() => resetRanking(bookmark)}
                  />
                  <RefreshAction subject="Bookmarks" revalidate={revalidate} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
