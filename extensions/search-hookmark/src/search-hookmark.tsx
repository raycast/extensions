import { LaunchProps, ActionPanel, List, Action } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { getBookmarks, openInHook } from "./hookmark";
import { useMemo, useState } from "react";
import fs from "fs";

const HookPath = "/System/Volumes/Data/Applications/Hookmark.app";
const HookPathSetapp = "/System/Volumes/Data/Applications/Setapp/Hookmark.app";
let iconPath: string;
if (fs.existsSync(HookPath)) {
  iconPath = HookPath;
  console.log(`iconPath is ${iconPath}`);
}

if (fs.existsSync(HookPathSetapp)) {
  iconPath = HookPathSetapp;
  console.log(`iconPath is ${iconPath}`);
}

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
    const urls = bookmarks?.filter((bookmark) => bookmark.path.includes("missing value"));
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
                  <Action
                    icon={{ fileIcon: `${iconPath}` }}
                    title="Open In Hookmark"
                    onAction={() => openInHook(bookmark.title, bookmark.address)}
                  />
                  <Action.OpenInBrowser title="Open In Finder" url={bookmark.address} />
                  <Action.CopyToClipboard
                    title="Copy As Markdown link"
                    content={`[${bookmark.title}](${bookmark.address})`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy As Hook link"
                    content={bookmark.address}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy As File Path"
                    content={bookmark.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />
                  <Action.Paste
                    title="Paste Markdown link"
                    content={`[${bookmark.title}](${bookmark.address})`}
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
              accessories={[{ text: bookmark.address }]}
              actions={
                <ActionPanel>
                  <Action
                    icon={{ fileIcon: `${iconPath}` }}
                    title="Open In Hookmark"
                    onAction={() => openInHook(bookmark.title, bookmark.address)}
                  />
                  <Action.CopyToClipboard
                    title="Copy As Markdown link"
                    content={`[${bookmark.title}](${bookmark.address})`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Markdown link"
                    content={`[${bookmark.title}](${bookmark.address})`}
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
