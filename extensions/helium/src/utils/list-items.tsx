import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { getFavicon, type MutatePromise } from "@raycast/utils";
import type { Bookmark, HistoryEntry, Suggestion, Tab } from "../types";
import {
  CloseTabAction,
  CopyBookmarkAsMarkdownAction,
  CopyBookmarkTitleAction,
  CopyBookmarkUrlAction,
  CopyTitleAction,
  CopyUrlAction,
  CreateQuicklinkAction,
  DeduplicateTabsAction,
  OpenBookmarkAction,
  OpenBookmarkInNewTabAction,
  OpenInHeliumAction,
  OpenInNewTabAction,
  OpenNewTabAction,
  ReloadAction,
  SwitchToTabAction,
} from "./actions";
import { SHORTCUTS } from "./shortcuts";
import { getSearchEngineName } from "./suggestions";
import { extractDomain, normalizeURL } from "./url";

// Shared list rows so Search Tabs, Search Bookmarks, Search History, Search Web
// and the unified Search Helium command render items with identical actions.

interface TabListItemProps {
  tab: Tab;
  /** Visible tabs (pending closes removed), used by Deduplicate Tabs. */
  tabs: Tab[];
  mutate: MutatePromise<Tab[], undefined>;
  revalidate: () => Promise<Tab[]>;
  pendingCloseIdsRef: React.MutableRefObject<Set<string>>;
}

export function TabListItem({ tab, tabs, mutate, revalidate, pendingCloseIdsRef }: TabListItemProps) {
  return (
    <List.Item
      id={tab.id}
      title={{ value: tab.title || "Untitled", tooltip: tab.title || "Untitled" }}
      subtitle={{ value: tab.url, tooltip: tab.url }}
      keywords={[tab.url, tab.title || ""]}
      icon={tab.favicon || getFavicon(tab.url, { fallback: Icon.Globe })}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <SwitchToTabAction tab={tab} />
            <OpenNewTabAction />
            <CloseTabAction tab={tab} mutate={mutate} revalidate={revalidate} pendingCloseIdsRef={pendingCloseIdsRef} />
            <OpenInNewTabAction tab={tab} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <CopyUrlAction tab={tab} />
            <CopyTitleAction tab={tab} />
            <CreateQuicklinkAction url={tab.url} name={tab.title || "Untitled"} />
            <DeduplicateTabsAction
              tabs={tabs}
              mutate={mutate}
              revalidate={revalidate}
              pendingCloseIdsRef={pendingCloseIdsRef}
            />
            <ReloadAction subject="Tabs" revalidate={revalidate} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function BookmarkListItem({
  bookmark,
  revalidate,
}: {
  bookmark: Bookmark;
  revalidate: () => Promise<unknown> | void;
}) {
  const accessories: List.Item.Accessory[] = [];

  // Add folder information if available
  if (bookmark.folder) {
    accessories.push({
      text: bookmark.folder,
      icon: Icon.Folder,
    });
  }

  return (
    <List.Item
      title={bookmark.title || "Untitled"}
      subtitle={bookmark.url}
      keywords={[bookmark.url, bookmark.title]}
      icon={getFavicon(bookmark.url, { fallback: Icon.Bookmark })}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookmarkAction bookmark={bookmark} />
            <OpenBookmarkInNewTabAction bookmark={bookmark} />
          </ActionPanel.Section>
          <CopyBookmarkUrlAction bookmark={bookmark} />
          <CopyBookmarkTitleAction bookmark={bookmark} />
          <CopyBookmarkAsMarkdownAction bookmark={bookmark} />
          <CreateQuicklinkAction url={bookmark.url} name={bookmark.title || "Untitled"} />
          <Action.Open
            title="Open in Default Browser"
            target={bookmark.url}
            icon={Icon.Globe}
            shortcut={SHORTCUTS.openInDefaultBrowser}
          />
          <DeduplicateTabsAction />
          <ReloadAction subject="Bookmarks" revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}

export function HistoryListItem({
  entry,
  revalidate,
}: {
  entry: HistoryEntry;
  revalidate: () => Promise<unknown> | void;
}) {
  const domain = extractDomain(entry.url);

  return (
    <List.Item
      title={entry.title}
      subtitle={domain}
      keywords={[entry.url, entry.title]}
      icon={getFavicon(entry.url, { fallback: Icon.Globe })}
      accessories={[{ text: new Date(entry.lastVisitedAt).toLocaleDateString() }]}
      actions={
        <ActionPanel>
          <OpenInHeliumAction title="Open in Helium" url={normalizeURL(entry.url)} />
          <Action.CopyToClipboard title="Copy URL" content={entry.url} shortcut={SHORTCUTS.copyUrl} />
          <Action.CopyToClipboard
            title="Copy as Markdown"
            content={`[${entry.title}](${entry.url})`}
            shortcut={SHORTCUTS.copyAsMarkdown}
          />
          <CreateQuicklinkAction url={entry.url} name={entry.title} />
          <ReloadAction subject="History" revalidate={revalidate} />
        </ActionPanel>
      }
    />
  );
}

/**
 * List item for a search suggestion
 */
export function SuggestionListItem({ suggestion }: { suggestion: Suggestion }) {
  const searchEngineName = getSearchEngineName();
  const isUrlType = suggestion.type === "url";
  const isBangType = suggestion.type === "bang";
  const providerName = suggestion.providerName ?? searchEngineName;

  const title = isUrlType ? `Open ${suggestion.query}` : isBangType ? `Open ${providerName}` : suggestion.query;
  const subtitle = isUrlType ? "Open URL" : isBangType ? suggestion.query : `Search with ${providerName}`;

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={isUrlType ? Icon.Link : Icon.MagnifyingGlass}
      actions={
        <ActionPanel>
          <OpenInHeliumAction
            title={isUrlType ? "Open URL" : isBangType ? `Open ${providerName}` : "Search"}
            url={suggestion.url}
          />
          <Action.CopyToClipboard title="Copy URL" content={suggestion.url} shortcut={SHORTCUTS.copyUrl} />
          <Action.CopyToClipboard title="Copy Query" content={suggestion.query} shortcut={SHORTCUTS.copyQuery} />
          <CreateQuicklinkAction url={suggestion.url} name={suggestion.query} />
        </ActionPanel>
      }
    />
  );
}
