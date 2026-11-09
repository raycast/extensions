/**
 * Search command built on raycast/extensions' extensions/raindrop-io/src/
 * search.tsx (MIT, commit 4cd99da7): same list, collection dropdown and item
 * components; the hooks behind them read the ME library through its helper.
 * Local filtering is off because the helper already searches title, URL, note
 * and tags, and Raycast's own filter would hide non-title matches.
 */
import { Action, ActionPanel, Icon, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ME_INSTALL_URL } from "./ui";
import BookmarkItem from "./components/BookmarkItem";
import EditBookmark from "./components/EditBookmark";
import AlreadySaved from "./components/AlreadySaved";
import { TrashBookmarkActions } from "./components/TrashBookmarkActions";
import CollectionsDropdown from "./components/CollectionsDropdown";
import { useRequest } from "./hooks/useRequest";

import { getShortcuts, ShortcutSettingsGate } from "./shortcut-settings";

export default function Main() {
  return (
    <ShortcutSettingsGate>
      <SearchBookmarks />
    </ShortcutSettingsGate>
  );
}

function SearchBookmarks() {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const {
    isLoading,
    isLoadingCollections,
    bookmarks,
    collections,
    collection,
    setCollection,
    revalidate,
    state,
    error,
    stale,
  } = useRequest(searchText);

  return (
    <List
      filtering={false}
      searchBarPlaceholder="Search titles, URLs, notes and tags…"
      searchBarAccessory={
        <CollectionsDropdown
          isLoading={isLoadingCollections}
          handleChange={setCollection}
          collections={collections}
          defaultValue={collection}
        />
      }
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle
    >
      <List.EmptyView
        icon={error ? Icon.ExclamationMark : Icon.Bookmark}
        title={error ? "ME Unavailable" : isLoading ? "Loading Bookmarks" : "No Bookmarks"}
        description={error ?? [state, "Search the shared local library."].filter(Boolean).join(" · ")}
        actions={
          <ActionPanel>
            <TrashBookmarkActions revalidate={revalidate} />
            <Action
              title="Refresh"
              shortcut={getShortcuts().shortcutRefresh}
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
            {error && <Action.OpenInBrowser title="ME Installation Guide" url={ME_INSTALL_URL} />}
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
      <List.Section
        title={
          error
            ? stale
              ? "Refresh failed · Showing previous results"
              : "ME needs attention"
            : state || undefined
        }
        subtitle={error}
      >
        {bookmarks?.items?.map((bookmark) => (
          <BookmarkItem
            key={bookmark._id}
            bookmark={bookmark}
            revalidate={revalidate}
            onEdit={(id, refresh) =>
              push(
                <EditBookmark
                  id={id}
                  revalidate={refresh}
                  onViewExisting={(links) => push(<AlreadySaved links={links} />)}
                />,
              )
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
