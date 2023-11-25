import { LaunchProps, ActionPanel, List, Action, closeMainWindow } from "@raycast/api";
import { useCachedPromise, getFavicon } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getBookmarks, openInHook, getHookIconPath, ShowHookedSubmenu } from "./utils/hookmark";
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
        return b.title === bookmark.title && b.address === bookmark.address && b.path === bookmark.path;
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
      isShowingDetail
    >
      <List.Section title={`Files:`} subtitle={`${numberOfBookmarksFile} bookmarks`}>
        {uniqueBookmarks
          ?.filter((bookmark) => bookmark.path !== "missing value")
          .map((bookmark) => (
            <List.Item
              title={bookmark.title}
              key={bookmark.address}
              icon={{ fileIcon: bookmark.path }}
              detail={
                <List.Item.Detail
                  isLoading={false}
                  markdown={
                    bookmark.path.endsWith(".pdf") ||
                    bookmark.path.endsWith(".jpg") ||
                    bookmark.path.endsWith(".jpeg") ||
                    bookmark.path.endsWith(".png")
                      ? `<img src="${encodeURIComponent(bookmark.path)}" alt="${bookmark.title}" height="190" />`
                      : `[${bookmark.title}](${bookmark.address})`
                  }
                  // markdown={`<img src="${encodeURIComponent(bookmark.path)}" alt="${bookmark.title}" height="190" />`}
                  // markdown={`[${bookmark.title}](${encodeURIComponent(bookmark.address)})`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Title"
                        text={bookmark.title}
                        icon={{ fileIcon: bookmark.path }}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Address"
                        text={bookmark.address}
                        target={bookmark.address}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Path" text={bookmark.path} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={{ fileIcon: `${iconPath}` }}
                    title="Open in Hookmark"
                    onAction={() => openInHook(bookmark.title, bookmark.address)}
                  />
                  <Action.Push title="Show Hooked Bookmarks" target={<ShowHookedSubmenu {...bookmark} />} />

                  <Action.OpenInBrowser title="Open in Finder" url={bookmark.address} />
                  <Action.CopyToClipboard
                    title="Copy as Markdown Link"
                    content={`[${bookmark.title}](${bookmark.address})`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy as Hook Link"
                    content={bookmark.address}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy as File Path"
                    content={bookmark.path}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                  />
                  <Action.Paste
                    title="Paste Markdown Link"
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
              detail={
                <List.Item.Detail
                  isLoading={false}
                  markdown={`[${bookmark.title}](${bookmark.address})`}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Title"
                        text={bookmark.title}
                        icon={getFavicon(bookmark.address)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Link
                        title="Address"
                        text={bookmark.address}
                        target={bookmark.address}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Path" text={bookmark.path} />
                      <List.Item.Detail.Metadata.Separator />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action
                    icon={{ fileIcon: `${iconPath}` }}
                    title="Open in Hookmark"
                    onAction={() => openInHook(bookmark.title, bookmark.address)}
                  />
                  <Action.Push title="Show Hooked Bookmarks" target={<ShowHookedSubmenu {...bookmark} />} />
                  <Action.CopyToClipboard
                    title="Copy As Markdown Link"
                    content={`[${bookmark.title}](${bookmark.address})`}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  <Action.Paste
                    title="Paste Markdown Link"
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
