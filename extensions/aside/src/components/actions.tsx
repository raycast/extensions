import {
  Action,
  ActionPanel,
  closeMainWindow,
  Icon,
  type Image,
  showHUD,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import type { MutatePromise } from "@raycast/utils";
import type React from "react";
import { closeAsideTabById, duplicateAsideTabById, focusAsideTabById, openUrlInAside } from "../lib/applescript";
import { deduplicateTabs } from "../lib/tabs";
import type { Bookmark, Tab } from "../lib/types";
import { normalizeAndValidateURL } from "../lib/url";

interface TabActionProps {
  tab: Tab;
  mutate: MutatePromise<Tab[], undefined>;
  pendingCloseIdsRef: React.MutableRefObject<Set<string>>;
}

// Primary: focus the actual tab via its Aside AppleScript id.
export function FocusTabAction({ tab }: { tab: Tab }) {
  return (
    <Action
      title="Focus Tab"
      icon={Icon.AppWindow}
      onAction={async () => {
        await closeMainWindow();
        const result = await focusAsideTabById(tab.id);
        if (result !== "success") {
          await showHUD("Could not focus Aside tab");
        }
      }}
    />
  );
}

interface OpenAsideUrlActionProps {
  url: string;
  title: string;
  icon?: Image.ImageLike;
  onOpen?: () => Promise<void> | void;
}

export function OpenAsideUrlAction({ url, title, icon = Icon.PlusCircle, onOpen }: OpenAsideUrlActionProps) {
  return (
    <Action
      title={title}
      icon={icon}
      onAction={async () => {
        try {
          await closeMainWindow();
          await openUrlInAside(url);
        } catch (error) {
          console.error("OpenAsideUrlAction:", error);
          await showHUD("Failed to open URL in Aside");
          return;
        }

        try {
          await onOpen?.();
        } catch (error) {
          console.error("OpenAsideUrlAction callback:", error);
        }
      }}
    />
  );
}

export function DuplicateTabAction({ tab }: { tab: Tab }) {
  return (
    <Action
      title="Duplicate Tab"
      icon={Icon.Duplicate}
      onAction={async () => {
        await closeMainWindow();
        const result = await duplicateAsideTabById(tab.id);
        if (result === "unsupported_url") {
          await showHUD("This tab URL cannot be duplicated safely");
        } else if (result !== "success") {
          await showHUD("Could not duplicate Aside tab");
        }
      }}
    />
  );
}

export function OpenInNewTabAction({ url, onOpen }: { url: string; onOpen?: () => Promise<void> | void }) {
  return <OpenAsideUrlAction title="Open in New Tab" url={url} onOpen={onOpen} />;
}

/**
 * Close a tab and update the list optimistically. We hold the id in a ref-set
 * (pendingCloseIdsRef) so that if `revalidate` races and refetches before
 * AppleScript actually closes the tab, the UI still hides the row.
 */
export function CloseTabAction({ tab, mutate, pendingCloseIdsRef }: TabActionProps) {
  return (
    <Action
      title="Close Tab"
      icon={Icon.XMarkCircle}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
      onAction={async () => {
        pendingCloseIdsRef.current.add(tab.id);
        try {
          await mutate(
            (async () => {
              // A stopped browser or stale tab id is harmless after revalidation.
              const result = await closeAsideTabById(tab.id);
              if (result === "failed") throw new Error("AppleScript could not close the tab");
              return undefined;
            })(),
            {
              optimisticUpdate: (data) => (data ? data.filter((t) => t.id !== tab.id) : []),
              rollbackOnError: true,
              shouldRevalidateAfter: true,
            },
          );
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to close tab",
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          pendingCloseIdsRef.current.delete(tab.id);
        }
      }}
    />
  );
}

function CopyUrlAction({ url }: { url: string }) {
  return <Action.CopyToClipboard title="Copy URL" content={url} shortcut={{ modifiers: ["cmd"], key: "c" }} />;
}

function CopyTitleAction({ title }: { title: string }) {
  return <Action.CopyToClipboard title="Copy Title" content={title} />;
}

function CopyAsMarkdownAction({ title, url }: { title: string; url: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy as Markdown"
      content={`[${title}](${url})`}
      shortcut={Keyboard.Shortcut.Common.CopyName}
    />
  );
}

function CreateQuicklinkAction({ url, name }: { url: string; name: string }) {
  return (
    <Action.CreateQuicklink quicklink={{ link: url, name }} shortcut={{ modifiers: ["cmd", "shift"], key: "q" }} />
  );
}

export function RefreshAction({ subject, revalidate }: { subject: string; revalidate: () => Promise<unknown> }) {
  return (
    <Action
      title={`Refresh ${subject}`}
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={async () => {
        await showToast({ style: Toast.Style.Animated, title: `Refreshing ${subject.toLowerCase()}…` });
        try {
          await revalidate();
          await showToast({ style: Toast.Style.Success, title: `Refreshed ${subject.toLowerCase()}` });
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: `Failed to refresh ${subject.toLowerCase()}`,
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }}
    />
  );
}

interface ManagedDeduplicationProps {
  mutate: MutatePromise<Tab[], undefined>;
  revalidate: () => Promise<unknown>;
  pendingCloseIdsRef: React.MutableRefObject<Set<string>>;
}

export function ManagedDeduplicateTabsAction({ mutate, revalidate, pendingCloseIdsRef }: ManagedDeduplicationProps) {
  return (
    <Action
      title="Deduplicate Tabs"
      icon={Icon.Filter}
      shortcut={{ modifiers: ["cmd", "shift", "ctrl"], key: "w" }}
      onAction={async () => {
        const optimisticallyHiddenIds: string[] = [];
        try {
          const deduplicationResult = await deduplicateTabs({
            onPlanned: async (duplicates) => {
              if (duplicates.length === 0) return;
              await showToast({
                style: Toast.Style.Animated,
                title: `Closing ${duplicates.length} duplicate tab${duplicates.length === 1 ? "" : "s"}…`,
              });

              const duplicateIds = duplicates.map((tab) => tab.id);
              for (const id of duplicateIds) {
                pendingCloseIdsRef.current.add(id);
                optimisticallyHiddenIds.push(id);
              }
              const duplicateIdSet = new Set(duplicateIds);
              await mutate(undefined, {
                optimisticUpdate: (data) => (data ? data.filter((tab) => !duplicateIdSet.has(tab.id)) : []),
                rollbackOnError: false,
                shouldRevalidateAfter: false,
              });
            },
          });

          if (deduplicationResult.browserStatus === "not_running") {
            await showToast({ style: Toast.Style.Failure, title: "Aside is not running" });
            return;
          }

          if (deduplicationResult.duplicateCount === 0) {
            await showToast({ style: Toast.Style.Success, title: "No duplicate tabs" });
            return;
          }

          // Failed closes: un-hide them in the UI and remove from optimistic state.
          if (deduplicationResult.failedIds.length > 0) {
            for (const id of deduplicationResult.failedIds) pendingCloseIdsRef.current.delete(id);
          }

          await revalidate();

          if (deduplicationResult.failedIds.length === 0) {
            await showToast({
              style: Toast.Style.Success,
              title: `Closed ${deduplicationResult.closedCount} duplicate tab${deduplicationResult.closedCount === 1 ? "" : "s"}`,
            });
          } else {
            await showToast({
              style: Toast.Style.Failure,
              title: `Closed ${deduplicationResult.closedCount} of ${deduplicationResult.duplicateCount} duplicates`,
              message: `${deduplicationResult.failedIds.length} tab${deduplicationResult.failedIds.length === 1 ? "" : "s"} could not be closed`,
            });
          }
        } catch (error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to deduplicate tabs",
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          for (const id of optimisticallyHiddenIds) pendingCloseIdsRef.current.delete(id);
        }
      }}
    />
  );
}

export function OpenBookmarkAction({ bookmark, onOpen }: { bookmark: Bookmark; onOpen?: () => Promise<void> | void }) {
  return <OpenAsideUrlAction title="Open Bookmark" url={bookmark.url} icon={Icon.ArrowRight} onOpen={onOpen} />;
}

export function OpenInDefaultBrowserAction({ url, onOpen }: { url: string; onOpen?: () => Promise<void> | void }) {
  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeAndValidateURL(url);
  } catch {
    return null;
  }

  return (
    <Action.OpenInBrowser
      title="Open in Default Browser"
      url={normalizedUrl}
      shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
      onOpen={() => {
        try {
          void Promise.resolve(onOpen?.()).catch((error) =>
            console.error("OpenInDefaultBrowserAction callback:", error),
          );
        } catch (error) {
          console.error("OpenInDefaultBrowserAction callback:", error);
        }
      }}
    />
  );
}

export function UrlActions({ url, title }: { url: string; title: string }) {
  return (
    <ActionPanel.Section title="URL Actions">
      <CopyUrlAction url={url} />
      <CopyTitleAction title={title} />
      <CopyAsMarkdownAction title={title} url={url} />
      <CreateQuicklinkAction url={url} name={title || url} />
    </ActionPanel.Section>
  );
}
