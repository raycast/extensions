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

  const numberOfBookmarks = useMemo(() => {
    return bookmarks?.length ?? 0;
  }, [bookmarks]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
    >
      <List.Section title={`Results:`} subtitle={`${numberOfBookmarks}`}>
        {bookmarks?.map((bookmark) => (
          <List.Item
            title={bookmark.title}
            key={bookmark.address}
            icon={bookmark.path == "missing value" ? getFavicon(bookmark.address) : { fileIcon: bookmark.path }}
            accessories={[{ text: bookmark.path == "missing value" ? bookmark.address : bookmark.path }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open bookmark" url={bookmark.address} />
                <Action.Open title="Open File" target={bookmark.path} />
                <Action.CopyToClipboard
                  title="Copy As File URL"
                  content={bookmark.address}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
                <Action.CopyToClipboard
                  title="Copy As Path"
                  content={bookmark.path}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
                <Action.Paste
                  title="Paste Address"
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
