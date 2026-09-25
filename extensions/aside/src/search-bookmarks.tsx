import { Action, ActionPanel, getPreferenceValues, Icon, List, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { RefreshAction } from "./components/actions";
import { BookmarkListItem } from "./components/bookmark-list-item";
import { ProfileDropdown } from "./components/profile-dropdown";
import { filterBookmarks, useProfileBookmarks } from "./lib/bookmarks";
import { useAsideProfiles } from "./lib/profiles";

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");
  const { profile: configuredProfile } = getPreferenceValues<Preferences.SearchBookmarks>();
  const { profile, setProfile, profiles, isLoading: isLoadingProfiles } = useAsideProfiles(configuredProfile);
  const { bookmarks, sortedBookmarks, visitBookmark, resetRanking, isLoading, error, revalidate } = useProfileBookmarks(
    profile,
    (err) => {
      showToast({ style: Toast.Style.Failure, title: "Could not read bookmarks", message: err.message });
    },
  );
  const bookmarksJson = useMemo(
    () =>
      JSON.stringify(
        (bookmarks ?? []).map(({ title, url, folder }) => ({
          title: title || url,
          url,
          folder: folder || null,
        })),
        null,
        2,
      ),
    [bookmarks],
  );
  const filteredBookmarks = filterBookmarks(sortedBookmarks, searchText);

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
          <BookmarkListItem
            key={bookmark.id}
            bookmark={bookmark}
            onOpen={() => visitBookmark(bookmark)}
            additionalActions={
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
            }
          />
        ))
      )}
    </List>
  );
}
