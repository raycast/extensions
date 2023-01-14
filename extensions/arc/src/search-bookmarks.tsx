import { Action, ActionPanel, List } from "@raycast/api";
import { VersionCheck } from "./version";
import { useBookmarks } from "./hooks/useBookmarks";
import { getDomain } from "./utils";
import { getFavicon } from "@raycast/utils";

function SearchBookmarks() {
  const { savedBookmarks, isBookmarksLoading } = useBookmarks();
  const bookmarksList = Object.keys(savedBookmarks).map((key) => ({ url: key, title: savedBookmarks[key] }));

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
