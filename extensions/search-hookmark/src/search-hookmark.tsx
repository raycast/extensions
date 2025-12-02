import { LaunchProps, ActionPanel, List, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getBookmarks, openInHook, getHookIconPath } from "./utils/hookmark";
import BookmarkListSection from "./utils/BookmarkListSection";
import { checkHookmarkInstallation } from "./utils/checkInstall";
import { showHookmarkNotOpenToast } from "./utils/checkOpen";
import { ShowHookedSubmenu } from "./show-hooked-link";

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

  const missingPathValue = "missing value";
  const files = uniqueBookmarks?.filter((bookmark) => bookmark.path !== missingPathValue) ?? [];
  const urls = uniqueBookmarks?.filter((bookmark) => bookmark.path.includes(missingPathValue)) ?? [];

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      filtering={{ keepSectionOrder: true }}
      onSearchTextChange={setSearchText}
      isShowingDetail
    >
      <BookmarkListSection
        title="Files:"
        bookmarks={files}
        isFileSection={true}
        renderActions={(bookmark) => (
          <ActionPanel>
            <Action
              icon={{ fileIcon: iconPath }}
              onAction={() => openInHook(bookmark.title, bookmark.address)}
              title="Open in Hookmark"
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
        )}
      />
      <BookmarkListSection
        title="URLs:"
        bookmarks={urls}
        isFileSection={false}
        renderActions={(bookmark) => (
          <ActionPanel>
            <Action
              icon={{ fileIcon: `${iconPath}` }}
              title="Open in Hookmark"
              onAction={() => openInHook(bookmark.title, bookmark.address)}
            />
            <Action.Push title="Show Hooked Bookmarks" target={<ShowHookedSubmenu {...bookmark} />} />
            <Action.CopyToClipboard
              title="Copy as Markdown Link"
              content={`[${bookmark.title}](${bookmark.address})`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.Paste
              title="Paste Markdown Link"
              content={`[${bookmark.title}](${bookmark.address})`}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel>
        )}
      />
    </List>
  );
}
