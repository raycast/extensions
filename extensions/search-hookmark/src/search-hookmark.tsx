import { LaunchProps, ActionPanel, List, Action } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getBookmarks, openInHook, getHookIconPath } from "./utils/hookmark";
import { checkHookmarkInstallation } from "./utils/checkInstall";
import { showHookmarkNotOpenToast } from "./utils/checkOpen";

export default function Command(props: LaunchProps) {
  checkHookmarkInstallation();

  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const { data, isLoading, error } = useCachedPromise(getBookmarks);

  if (error) {
    showHookmarkNotOpenToast();
  }

  const iconPath = getHookIconPath();
  const bookmarks = useMemo(() => {
    return data?.filter((bookmark) => {
      return bookmark.title.toLowerCase().includes(searchText.toLowerCase());
    });
  }, [data, searchText]);

  const uniqueBookmarks = bookmarks?.filter((bookmark, index) => {
    return (
      index ===
      bookmarks?.findIndex((b) => {
        return (
          b.title === bookmark.title &&
          b.address === bookmark.address &&
          b.path === bookmark.path &&
          b.file === bookmark.file
        );
      })
    );
  });

  // console.log(bookmarks.length)
  // console.log(uniqueBookmarks.length)

  const numberOfBookmarksFile = useMemo(() => {
    const files = uniqueBookmarks?.filter((bookmark) => bookmark.path !== "missing value");
    return files?.length ?? 0;
  }, [uniqueBookmarks]);

  const numberOfBookmarksURL = useMemo(() => {
    const urls = uniqueBookmarks?.filter((bookmark) => bookmark.path.includes("missing value"));
    return urls?.length ?? 0;
  }, [uniqueBookmarks]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
    >
      <List.Section title={`Files:`} subtitle={`${numberOfBookmarksFile} bookmarks`}>
        {uniqueBookmarks
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
        {uniqueBookmarks
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
