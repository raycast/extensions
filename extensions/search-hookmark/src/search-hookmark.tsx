import { LaunchProps, ActionPanel, List, Action } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { getBookmarks } from "./hookmark";
import { useMemo, useState } from "react";

export default function Command(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data, isLoading } = useCachedPromise(getBookmarks);

  const bookmarks = useMemo(() => {
    return data?.filter((bookmark) => {
      return bookmark.title.toLowerCase().includes(searchText.toLowerCase());
    });
  }, [data, searchText]);

  const numberOfBookmarksFile = useMemo(() => {
    const files = bookmarks?.filter((bookmark) => bookmark.path !== "missing value");
    return files?.length ?? 0;
  }, [bookmarks]);

  const numberOfBookmarksURL = useMemo(() => {
    const urls = bookmarks?.filter((bookmark) => bookmark.path === "missing value");
    return urls?.length ?? 0;
  }, [bookmarks]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
    >
      <List.Section title={`Files:`} subtitle={`${numberOfBookmarksFile} bookmarks`}>
        {bookmarks
          ?.filter((bookmark) => bookmark.path !== "missing value")
          .map((bookmark) => (
            <List.Item
              title={bookmark.title}
              key={bookmark.address}
              icon={{ fileIcon: bookmark.path }}
              accessories={[{ text: bookmark.path }]}
              actions={
                <ActionPanel>
                  <Action.Open title="Open In Hookmark" target={bookmark.path} application={"Hookmark"} />
                  <Action.OpenInBrowser title="Open In Finder" url={bookmark.address} />
                  <Action.CopyToClipboard
                    title="Copy As Hook link"
                    content={bookmark.address}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy As File Path"
                    content={bookmark.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Hook link"
                    content={bookmark.address}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>

      <List.Section title={`URLs:`} subtitle={`${numberOfBookmarksURL} bookmarks`}>
        {bookmarks
          ?.filter((bookmark) => bookmark.path.includes("missing value"))
          .map((bookmark) => (
            <List.Item
              title={bookmark.title}
              key={bookmark.address}
              icon={getFavicon(bookmark.address)}
              accessories={[{ text: bookmark.path }]}
              actions={
                <ActionPanel>
                  <Action.Open title="Open In Hookmark" target={bookmark.address} application={"Hookmark"} />
                  <Action.CopyToClipboard
                    title="Copy As Hook link"
                    content={bookmark.address}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
                  <Action.Paste
                    title="Paste Hook link"
                    content={bookmark.address}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
