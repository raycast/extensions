import { Action, Icon, showToast, Toast, closeMainWindow, open } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import type { Tab, Bookmark } from "../types";
import {
  switchToHeliumTab,
  switchToHeliumTabById,
  closeHeliumTab,
  closeHeliumTabById,
  openUrlInHelium,
} from "./applescript";
import { getBrowserTabs } from "./browser";

interface BaseActionProps {
  tab: Tab;
}

interface MutationActionProps extends BaseActionProps {
  mutate: MutatePromise<Tab[], undefined>;
  deletedTabIdsRef: React.MutableRefObject<Set<number>>;
}

/**
 * Action to switch to an existing tab using AppleScript.
 *
 * Prefers the Helium AppleScript `id` bridged at fetch time (see
 * {@link getBrowserTabs}). This guarantees we hit the exact tab the user
 * picked even when several tabs share the same URL. Falls back to URL
 * matching if the id wasn't resolved (e.g., Helium wasn't running at fetch
 * time or the AS call failed).
 */
export function SwitchToTabAction({ tab }: BaseActionProps) {
  return (
    <Action
      title="Switch to Tab"
      icon={Icon.ArrowRight}
      onAction={async () => {
        try {
          const switched = tab.heliumId ? await switchToHeliumTabById(tab.heliumId) : await switchToHeliumTab(tab.url);
          if (switched) {
            await closeMainWindow();
          } else {
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

interface RevalidateActionProps {
  /**
   * Shown in the Action Panel and in the success toast. Keep it specific to
   * the list being reloaded ("Tabs", "Bookmarks", …).
   */
  subject?: string;
  /**
   * The `revalidate` callback from `usePromise`. `usePromise` returns
   * `() => Promise<T>`, but we only care about the side effect, so the type
   * is relaxed to `unknown`.
   */
  revalidate: () => Promise<unknown> | void;
}

/**
 * Generic ⌘R reload action. Works for any `usePromise`-backed list.
 */
export function ReloadAction({ subject = "List", revalidate }: RevalidateActionProps) {
  return (
    <Action
      title={`Reload ${subject}`}
      icon={Icon.ArrowClockwise}
      shortcut={{ modifiers: ["cmd"], key: "r" }}
      onAction={async () => {
        await showToast({
          style: Toast.Style.Animated,
          title: `Reloading ${subject.toLowerCase()}…`,
        });
        try {
          await Promise.resolve(revalidate());
          await showToast({
            style: Toast.Style.Success,
            title: `${subject} reloaded`,
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Failed to reload ${subject.toLowerCase()}`,
            message: error instanceof Error ? error.message : String(error),
          });
        }
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

          // Execute the actual close in the browser (prefer id; fallback to URL)
          const success = tab.heliumId ? await closeHeliumTabById(tab.heliumId) : await closeHeliumTab(tab.url);

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

/**
 * Action to close duplicate tabs by exact URL match.
 *
 * For every URL that appears more than once among the open tabs, keeps the
 * first occurrence (AS traversal order) and closes the rest via
 * {@link closeHeliumTabById}. The action is self-contained: if no `tabs` are
 * provided (e.g., invoked from search-bookmarks or search-web), it fetches
 * the current tab list itself, so it can be safely dropped into any command.
 *
 * When used from a list that owns the tab cache, pass `mutate` and
 * `deletedTabIdsRef` to apply an optimistic update so the list reflects the
 * closures immediately.
 */
interface DeduplicateTabsActionProps {
  tabs?: Tab[];
  mutate?: MutatePromise<Tab[], undefined>;
  deletedTabIdsRef?: React.MutableRefObject<Set<number>>;
}
export function DeduplicateTabsAction({ tabs, mutate, deletedTabIdsRef }: DeduplicateTabsActionProps = {}) {
  return (
    <Action
      title="Deduplicate Tabs"
      icon={Icon.Filter}
      shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "w" }}
      onAction={async () => {
        try {
          const currentTabs = tabs ?? (await getBrowserTabs());

          // Group by URL in traversal order, keep first, mark rest for close.
          const seen = new Set<string>();
          const duplicates: Tab[] = [];
          for (const t of currentTabs) {
            if (seen.has(t.url)) duplicates.push(t);
            else seen.add(t.url);
          }

          if (duplicates.length === 0) {
            await showToast({ style: Toast.Style.Success, title: "No duplicate tabs" });
            return;
          }

          await showToast({
            style: Toast.Style.Animated,
            title: `Closing ${duplicates.length} duplicate tab${duplicates.length === 1 ? "" : "s"}`,
          });

          // Optimistic update when the caller owns the cache.
          if (mutate && deletedTabIdsRef) {
            for (const t of duplicates) deletedTabIdsRef.current.add(t.id);
            await mutate(undefined, {
              optimisticUpdate(data) {
                if (!data) return [];
                const ids = new Set(duplicates.map((t) => t.id));
                return data.filter((t) => !ids.has(t.id));
              },
            });
          }

          // Close each duplicate. Prefer heliumId (guaranteed to hit the exact
          // duplicate); fall back to URL only if no id was resolved.
          let closed = 0;
          for (const t of duplicates) {
            try {
              const ok = t.heliumId ? await closeHeliumTabById(t.heliumId) : await closeHeliumTab(t.url);
              if (ok) closed += 1;
            } catch {
              // Ignore individual failures; surface aggregate below.
            }
          }

          await showToast({
            style: closed > 0 ? Toast.Style.Success : Toast.Style.Failure,
            title:
              closed > 0 ? `Closed ${closed} duplicate tab${closed === 1 ? "" : "s"}` : "Failed to close duplicates",
          });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to deduplicate tabs",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }}
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
