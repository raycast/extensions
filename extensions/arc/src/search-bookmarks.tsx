import { Action, ActionPanel, List } from "@raycast/api";
import { VersionCheck } from "./version";
import { useBookmarks } from "./hooks/useBookmarks";
import { getDomain } from "./utils";
import { getFavicon } from "@raycast/utils";
import { BookmarkTabAction } from "./actions";
import { Tab } from "./types";

function SearchBookmarks() {
  const { savedBookmarks, isBookmarksLoading, updateBookmarks } = useBookmarks();
  const bookmarksList = Object.keys(savedBookmarks).map(
    (key) =>
      ({
        url: key,
        title: savedBookmarks[key],
        location: "unpinned",
        windowId: 0,
        tabId: 0,
      } as Tab)
  );

  return (
    <List isLoading={isBookmarksLoading}>
      {bookmarksList?.map((tab) => (
        <List.Item
          key={tab.url + tab.title}
          title={tab.title}
          icon={getFavicon(tab.url)}
          subtitle={getDomain(tab.url)}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                title="Open In Browser"
                url={tab.url}
                shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
              />
              <BookmarkTabAction tab={tab} savedBookmarks={savedBookmarks} updateBookmarks={updateBookmarks} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <VersionCheck>
      <SearchBookmarks />
    </VersionCheck>
  );
}
