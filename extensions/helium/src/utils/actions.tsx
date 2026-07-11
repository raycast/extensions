import { Action, Icon, showToast, Toast, closeMainWindow } from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import type { Tab, Bookmark } from "../types";
import { switchToHeliumTabById, closeHeliumTabById, openUrlInHelium } from "./applescript";
import { getBrowserTabs } from "./browser";
import { idsStillPresent } from "./pending-close";

interface BaseActionProps {
  tab: Tab;
}

interface MutationActionProps extends BaseActionProps {
  mutate: MutatePromise<Tab[], undefined>;
  revalidate: () => Promise<Tab[]> | void;
  pendingCloseIdsRef: React.MutableRefObject<Set<string>>;
}

/**
 * Action to switch to an existing tab using AppleScript.
 *
 * Uses the stable Helium AppleScript `id` bridged at fetch time (see
 * {@link getBrowserTabs}) so we always target the exact tab the user picked,
 * even when several tabs share the same URL.
 */
export function SwitchToTabAction({ tab }: BaseActionProps) {
  return (
    <Action
      title="Switch to Tab"
      icon={Icon.ArrowRight}
      onAction={async () => {
        try {
          const switched = await switchToHeliumTabById(tab.id);
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
        try {
          await openUrlInHelium("chrome://new-tab-page/");
          await closeMainWindow();
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to open new tab",
            message: error instanceof Error ? error.message : String(error),
          });
        }
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
export function CloseTabAction({ tab, mutate, revalidate, pendingCloseIdsRef }: MutationActionProps) {
  return (
    <Action
      title="Close Tab"
      icon={Icon.XMarkCircle}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      onAction={async () => {
        // Keep in-flight closes hidden even if another mutation revalidates first.
        pendingCloseIdsRef.current.add(tab.id);

        await showToast({
          style: Toast.Style.Animated,
          title: "Closing tab",
        });

        try {
          // Optimistically update the cache immediately, then reconcile after
          // the real close finishes so we don't refetch stale tab data first.
          await mutate(undefined, {
            optimisticUpdate(data) {
              if (!data) return [];
              return data.filter((t) => t.id !== tab.id);
            },
            rollbackOnError: false,
            shouldRevalidateAfter: false,
          });

          const success = await closeHeliumTabById(tab.id);

          if (!success) {
            throw new Error("Tab not found or failed to close");
          }

          const confirmed = await revalidateUntilIdsAbsent(revalidate, [tab.id]);
          if (confirmed) pendingCloseIdsRef.current.delete(tab.id);

          await showToast({
            style: Toast.Style.Success,
            title: confirmed ? "Tab closed" : "Tab close pending",
          });
        } catch (error) {
          pendingCloseIdsRef.current.delete(tab.id);

          try {
            await Promise.resolve(revalidate());
          } catch {
            // Restore the tab locally if the refresh also fails.
            await mutate(undefined, {
              optimisticUpdate(data) {
                if (!data) return [tab];
                if (data.some((t) => t.id === tab.id)) return data;
                return [tab, ...data];
              },
              rollbackOnError: false,
              shouldRevalidateAfter: false,
            });
          }

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
 * provided, it fetches the current tab list itself, so it can be safely
 * dropped into any command that needs a standalone dedupe action.
 *
 * When used from a list that owns the tab cache, pass `mutate`, `revalidate`,
 * and `pendingCloseIdsRef` to apply an optimistic update and then reconcile
 * with the actual browser state after the closes finish.
 */
interface DeduplicateTabsActionProps {
  tabs?: Tab[];
  mutate?: MutatePromise<Tab[], undefined>;
  revalidate?: () => Promise<Tab[]> | void;
  pendingCloseIdsRef?: React.MutableRefObject<Set<string>>;
}
export function DeduplicateTabsAction({
  tabs,
  mutate,
  revalidate,
  pendingCloseIdsRef,
}: DeduplicateTabsActionProps = {}) {
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

          const duplicateIds = duplicates.map((t) => t.id);
          const optimisticContext =
            mutate && revalidate && pendingCloseIdsRef ? { mutate, revalidate, pendingCloseIdsRef } : undefined;

          if (optimisticContext) {
            for (const id of duplicateIds) optimisticContext.pendingCloseIdsRef.current.add(id);
          }

          const closedIds: string[] = [];
          try {
            if (optimisticContext) {
              await optimisticContext.mutate(undefined, {
                optimisticUpdate(data) {
                  if (!data) return [];
                  const ids = new Set(duplicateIds);
                  return data.filter((t) => !ids.has(t.id));
                },
                rollbackOnError: false,
                shouldRevalidateAfter: false,
              });
            }

            for (const t of duplicates) {
              try {
                const ok = await closeHeliumTabById(t.id);
                if (ok) {
                  closedIds.push(t.id);
                } else if (optimisticContext) {
                  optimisticContext.pendingCloseIdsRef.current.delete(t.id);
                }
              } catch {
                if (optimisticContext) optimisticContext.pendingCloseIdsRef.current.delete(t.id);
              }
            }
          } finally {
            if (optimisticContext) {
              const confirmed = await revalidateUntilIdsAbsent(optimisticContext.revalidate, closedIds);
              if (confirmed) {
                for (const id of closedIds) optimisticContext.pendingCloseIdsRef.current.delete(id);
              }
            }
          }

          const closed = closedIds.length;
          await showToast({
            style: closed === duplicates.length ? Toast.Style.Success : Toast.Style.Failure,
            title:
              closed > 0
                ? `Closed ${closed}/${duplicates.length} duplicate tab${duplicates.length === 1 ? "" : "s"}`
                : "Failed to close duplicates",
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
        try {
          await openUrlInHelium(bookmark.url);
          await closeMainWindow();
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

async function revalidateUntilIdsAbsent(
  revalidate: () => Promise<Tab[]> | void,
  ids: string[],
  attempts = 3,
  delayMs = 150,
): Promise<boolean> {
  if (ids.length === 0) return true;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const tabs = await Promise.resolve(revalidate());
      if (Array.isArray(tabs) && idsStillPresent(ids, tabs).length === 0) return true;
    } catch {
      return false;
    }

    if (attempt < attempts - 1) await sleep(delayMs);
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
