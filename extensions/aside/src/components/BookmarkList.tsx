import { Action, ActionPanel, closeMainWindow, Icon, Image, Keyboard, List } from "@raycast/api";
import { getFavicon, showFailureToast } from "@raycast/utils";
import { createTab } from "../lib/browser";
import { useBookmarks } from "../hooks/use-bookmarks";
import { BrowserErrorView } from "./BrowserErrorView";
import { AsideCompatibilityNotice } from "./AsideCompatibilityNotice";

function favicon(url: string): Image.ImageLike {
  try {
    return getFavicon(url, { mask: Image.Mask.Circle });
  } catch {
    return Icon.Bookmark;
  }
}

export function BookmarkList() {
  const { data, error, isLoading, revalidate } = useBookmarks();

  if (error) return <BrowserErrorView error={error} onRetry={revalidate} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search bookmark titles and URLs…">
      <AsideCompatibilityNotice />
      {data?.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          title={bookmark.title || "Untitled Bookmark"}
          subtitle={{ value: bookmark.url, tooltip: bookmark.url }}
          keywords={[bookmark.url, ...bookmark.path]}
          icon={favicon(bookmark.url)}
          accessories={bookmark.path.length ? [{ text: bookmark.path.join(" › ") }] : undefined}
          actions={
            <ActionPanel title={bookmark.title || "Untitled Bookmark"}>
              <Action
                title="Open in Aside"
                icon={Icon.Globe}
                onAction={async () => {
                  try {
                    await createTab(bookmark.url);
                    await closeMainWindow();
                  } catch (error) {
                    await showFailureToast(error, { title: "Failed opening bookmark" });
                  }
                }}
              />
              <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
              <Action.CopyToClipboard title="Copy Title" content={bookmark.title || "Untitled Bookmark"} />
              <Action.CopyToClipboard
                title="Copy Markdown Link"
                content={`[${bookmark.title || "Untitled Bookmark"}](${bookmark.url})`}
                icon={Icon.Link}
              />
              <Action.CreateQuicklink
                quicklink={{ name: bookmark.title || "Aside Bookmark", link: bookmark.url, application: "Aside" }}
              />
              <Action
                title="Refresh Bookmarks"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
      {!isLoading && !data?.length ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No bookmarks found"
          description="Save a bookmark in Aside, then try again."
        />
      ) : null}
    </List>
  );
}
