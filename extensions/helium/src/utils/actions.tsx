import { Action, Icon, showToast, Toast, closeMainWindow, open } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import type { Tab, Bookmark } from "../types";
import { switchToHeliumTab, closeHeliumTab, openUrlInHelium } from "./applescript";

interface BaseActionProps {
  tab: Tab;
}

interface MutationActionProps extends BaseActionProps {
  mutate: MutatePromise<Tab[], undefined>;
  deletedTabIdsRef: React.MutableRefObject<Set<number>>;
}

interface RevalidateActionProps {
  revalidate: () => Promise<Tab[]>;
}

/**
 * Action to switch to an existing tab using AppleScript
 */
export function SwitchToTabAction({ tab }: BaseActionProps) {
  return (
    <Action
      title="Switch to Tab"
      icon={Icon.ArrowRight}
      onAction={async () => {
        await closeMainWindow();
        try {
          const switched = await switchToHeliumTab(tab.url);
          if (!switched) {
            await showToast({
              style: Toast.Style.Failure,
              title: "Tab not found",
              message: "The tab may have been closed",
            });
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to switch to tab",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }}
    />
  );
}

/**
 * Action to open a new tab in Helium
 */
export function OpenNewTabAction() {
  return (
    <Action
      title="Open New Tab"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      onAction={async () => {
        await closeMainWindow();
        await open("chrome://new-tab-page/", "net.imput.helium");
      }}
    />
  );
}

/**
 * Action to reload the tab list
 */
export function ReloadTabListAction({ revalidate }: RevalidateActionProps) {
  return (
    <Action
      title="Reload Tab List"
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        await showToast({
          style: Toast.Style.Animated,
          title: "Reloading tabs...",
        });
        await revalidate();
        await showToast({
          style: Toast.Style.Success,
          title: "Tabs reloaded",
        });
      }}
    />
  );
}

/**
 * Action to close a tab with optimistic updates
 */
export function CloseTabAction({ tab, mutate, deletedTabIdsRef }: MutationActionProps) {
  return (
    <Action
      title="Close Tab"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      onAction={async () => {
        // Mark tab as deleted immediately - it will be filtered out client-side
        deletedTabIdsRef.current.add(tab.id);

        await showToast({
          style: Toast.Style.Animated,
          title: "Closing tab",
        });

        try {
          // Optimistically update the cache immediately
          await mutate(
            undefined, // Don't pass a promise - just keep the optimistic update
            {
              optimisticUpdate(data) {
                if (!data) return [];
                const filtered = data.filter((t) => t.id !== tab.id);
                return filtered;
              },
            },
          );

          // Execute the actual close in the browser
          const success = await closeHeliumTab(tab.url);

          if (!success) {
            throw new Error("Tab not found or failed to close");
          }

          await showToast({
            style: Toast.Style.Success,
            title: "Tab closed",
          });
        } catch (error) {
          // On error, remove from deleted set so it shows again
          deletedTabIdsRef.current.delete(tab.id);
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to close tab",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }}
    />
  );
}

/**
 * Action to open URL in a new Helium tab
 */
export function OpenInNewTabAction({ tab }: BaseActionProps) {
  return (
    <Action.Open
      title="Open in New Tab"
      target={tab.url}
      application="net.imput.helium"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
    />
  );
}

/**
 * Action to copy URL to clipboard
 */
export function CopyUrlAction({ tab }: BaseActionProps) {
  return <Action.CopyToClipboard title="Copy URL" content={tab.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />;
}

/**
 * Action to copy tab title to clipboard
 */
export function CopyTitleAction({ tab }: BaseActionProps) {
  return (
    <Action.CopyToClipboard
      title="Copy Title"
      content={tab.title || ""}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  );
}

/**
 * Action to copy tab as markdown link
 */
export function CopyAsMarkdownAction({ tab }: BaseActionProps) {
  return (
    <Action.CopyToClipboard
      title="Copy as Markdown"
      content={`[${tab.title}](${tab.url})`}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
    />
  );
}

// ============ Bookmark Actions ============

interface BookmarkActionProps {
  bookmark: Bookmark;
}

/**
 * Action to open a bookmark in Helium
 */
export function OpenBookmarkAction({ bookmark }: BookmarkActionProps) {
  return (
    <Action
      title="Open Bookmark"
      icon={Icon.ArrowRight}
      onAction={async () => {
        await closeMainWindow();
        try {
          await openUrlInHelium(bookmark.url);
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to open bookmark",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }}
    />
  );
}

/**
 * Action to open bookmark in new tab
 */
export function OpenBookmarkInNewTabAction({ bookmark }: BookmarkActionProps) {
  return (
    <Action.Open
      title="Open in New Tab"
      target={bookmark.url}
      application="net.imput.helium"
      icon={Icon.PlusCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
    />
  );
}

/**
 * Action to copy bookmark URL
 */
export function CopyBookmarkUrlAction({ bookmark }: BookmarkActionProps) {
  return <Action.CopyToClipboard title="Copy URL" content={bookmark.url} shortcut={{ modifiers: ["cmd"], key: "c" }} />;
}

/**
 * Action to copy bookmark title
 */
export function CopyBookmarkTitleAction({ bookmark }: BookmarkActionProps) {
  return (
    <Action.CopyToClipboard
      title="Copy Title"
      content={bookmark.title}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  );
}

/**
 * Action to copy bookmark as markdown
 */
export function CopyBookmarkAsMarkdownAction({ bookmark }: BookmarkActionProps) {
  return (
    <Action.CopyToClipboard
      title="Copy as Markdown"
      content={`[${bookmark.title}](${bookmark.url})`}
      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
    />
  );
}

// ============ Universal Quicklink Action ============

interface QuicklinkActionProps {
  url: string;
  name: string;
}

/**
 * Action to create a Raycast Quicklink for any URL
 * Works with tabs, bookmarks, history entries, and suggestions
 */
export function CreateQuicklinkAction({ url, name }: QuicklinkActionProps) {
  return (
    <Action.CreateQuicklink
      quicklink={{ link: url, name: name }}
      shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
    />
  );
}
