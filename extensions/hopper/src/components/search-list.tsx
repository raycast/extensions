import { Action, ActionPanel, Form, Icon, Keyboard, List, open, showToast, Toast, useNavigation } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useRef, useState, type ReactNode } from "react";
import { activateApp, getRecentApps } from "../lib/platform/macos";
import { macosPlatform } from "../lib/platform/os";
import { showFailure } from "../lib/platform/report";
import {
  bookmarkFor,
  loadBookmarks,
  renameBookmark,
  setBookmark,
  withBookmark,
  withoutBookmark,
  withTitle,
  type Bookmark,
} from "../lib/tabs/bookmarks";
import {
  forgetClosed,
  jumpOrOpen,
  openTabFor,
  recordHistory,
  reopenClosed,
  type ClosedTab,
  type Reopenable,
} from "../lib/tabs/history";
import { loadTabs, selectTab } from "../lib/tabs/load";
import type { App, Tab, TabKind } from "../lib/tabs/model";
import { adjacentSection, searchTabs } from "../lib/tabs/search";
import type { ListedAgent } from "../lib/agents/load";
import { STATUS_TITLE } from "../lib/agents/status";
import { loadAllAgents } from "../lib/platform/agents";
import { AgentItem, STATUS_COLOR } from "./agent-list";
import { SwitchAction } from "./switch-action";

export type Scope = "all" | "current";

const AUTOMATION_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Automation";
const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

const KIND_ICON: Record<TabKind, Icon> = {
  tab: Icon.AppWindowSidebarLeft,
  window: Icon.AppWindow,
  workspace: Icon.Terminal,
  session: Icon.SpeechBubble,
  conversation: Icon.Message,
};

async function load(scope: Scope) {
  const recent = await getRecentApps();
  // The frontmost app is recent[0]: Raycast itself is filtered out by getRecentApps().
  const apps = scope === "current" ? recent.slice(0, 1) : recent;
  const result = await loadTabs(apps, macosPlatform);
  // Only apps this read speaks for can have closed tabs: all of them (running or not) for Search, the current app
  // for Search Current App, never an app that failed to read. Without Accessibility some sources see nothing,
  // which must not look like everything closed.
  const failed = new Set(result.failures.map((f) => f.app.bundleId));
  const covered = (bundleId: string) =>
    result.accessibility && !failed.has(bundleId) && (scope === "all" || bundleId === recent[0]?.bundleId);
  const [closed, bookmarks] = await Promise.all([
    recordHistory(macosPlatform, result.tabs, covered, Date.now()),
    loadBookmarks(macosPlatform),
  ]);
  return {
    ...result,
    closed: scope === "all" ? closed : closed.filter((c) => c.app.bundleId === recent[0]?.bundleId),
    bookmarks,
    current: recent[0],
  };
}

/**
 * Search: tabs, windows, sessions, and agents of every running app (or only the current one), grouped by app.
 * An agent's status shows on the tab it runs in (a Claude Code session, a terminal or herdr tab), and the agent
 * has a row of its own in that app's section.
 */
export function SearchList({ scope }: { scope: Scope }) {
  // Cached: the last list shows instantly while fresh data loads. A stale entry is safe to pick: selection
  // looks the tab up again and reports it if it's gone, and a bookmark or closed entry reads its app again first.
  const { data, isLoading, revalidate, mutate } = useCachedPromise(load, [scope], {
    keepPreviousData: true,
    onError: (error) => showFailure(error, "Could not read tabs"),
  });
  const {
    tabs = [],
    closed = [],
    bookmarks: allBookmarks = [],
    failures = [],
    accessibility = true,
    current,
  } = data ?? {};
  const bookmarks = scope === "all" ? allBookmarks : allBookmarks.filter((b) => b.app.bundleId === current?.bundleId);
  const bookmarked = new Set(allBookmarks.map((b) => b.id));
  // Bookmarks are part of the list's data: a change is shown at once, without reading every app again.
  const changeBookmark = (entry: Omit<Bookmark, "addedAt">, on: boolean) =>
    mutate(setBookmark(macosPlatform, entry, on, Date.now()), {
      optimisticUpdate: (data) =>
        data && {
          ...data,
          bookmarks: on ? withBookmark(data.bookmarks, entry, Date.now()) : withoutBookmark(data.bookmarks, entry.id),
        },
      shouldRevalidateAfter: false,
    });
  const renameTo = (id: string, title: string) =>
    mutate(renameBookmark(macosPlatform, id, title), {
      optimisticUpdate: (data) => data && { ...data, bookmarks: withTitle(data.bookmarks, id, title) },
      shouldRevalidateAfter: false,
    });
  // Agents: read after the tabs, which it reuses to locate them, so the list shows first. Not on the cached tabs
  // while fresh ones load: the cached agents already show, and two reads at once can exceed the heap (ADR-032).
  const { data: agentData, revalidate: reloadAgents } = useCachedPromise(
    (read: Tab[]) => loadAllAgents({ tabs: read }),
    [tabs],
    {
      execute: !isLoading && tabs.length > 0,
      keepPreviousData: true,
      onError: (error) => showFailure(error, "Could not read agents"),
    },
  );
  const agentByTab = new Map(
    (agentData?.agents ?? []).flatMap((a) => (a.location?.tab ? [[a.location.tab.key, a] as const] : [])),
  );
  // Every located agent also has a row of its own in its app's section, so searching its name finds it; except
  // where its tab already says the same (a Claude Code session is both a tab and an agent, same title).
  const tabTitles = new Map(tabs.map((t) => [t.key, t.title]));
  const agents = (agentData?.agents ?? []).filter((a) => {
    if (!a.location || (scope === "current" && a.location.app.bundleId !== current?.bundleId)) return false;
    const place = a.location.tab?.key;
    return !(place && tabTitles.get(place) === a.title);
  });
  const entries: Entry[] = [...tabs.map(tabEntry), ...agents.map(agentEntry)];

  // Own filtering (ADR-015): typo-tolerant, and ranks an app's own tabs above tabs that mention its name.
  const [query, setQuery] = useState("");
  const sections = groupByApp(searchTabs(entries, query));
  const shownBookmarks = searchTabs(bookmarks, query);
  const shownClosed = searchTabs(closed, query);

  // Next / Previous App. The selected row lives in a ref, not state: ↑ / ↓ must not re-render the whole list
  // (every render sends every row to Raycast). Only a jump sets `jumpTo`, which Raycast selects; the first move
  // away clears it again (one render), so a later jump to the same row still reaches Raycast. Typing clears it too,
  // leaving Raycast to select the top match.
  const selected = useRef<string>(undefined);
  const [jumpTo, setJumpTo] = useState<string>();
  const rows = [
    ...sections.map((s) => s.entries.map(entryId)),
    shownBookmarks.map(bookmarkId),
    shownClosed.map(closedId),
  ];
  const move = (step: 1 | -1) => setJumpTo(adjacentSection(rows, selected.current, step));
  const appActions = (
    <ActionPanel.Section>
      <Action
        title="Next App"
        icon={Icon.ArrowRight}
        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
        onAction={() => move(1)}
      />
      <Action
        title="Previous App"
        icon={Icon.ArrowLeft}
        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
        onAction={() => move(-1)}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      selectedItemId={jumpTo}
      onSelectionChange={(id) => {
        selected.current = id ?? undefined;
        if (jumpTo && id !== jumpTo) setJumpTo(undefined);
      }}
      onSearchTextChange={(text) => {
        setQuery(text);
        setJumpTo(undefined);
      }}
      searchBarPlaceholder={
        scope === "current" && current ? `Search ${current.name}` : "Search apps, tabs, sessions, and agents"
      }
    >
      {sections.map(({ app, entries }) => (
        <List.Section key={app.bundleId} title={app.name} subtitle={String(entries.length)}>
          {entries.map((entry) =>
            entry.tab ? (
              <TabItem key={entry.tab.key} id={entryId(entry)} tab={entry.tab} agent={agentByTab.get(entry.tab.key)}>
                <BookmarkAction entry={bookmarkFor(entry.tab)} bookmarked={bookmarked} onChange={changeBookmark} />
                {appActions}
              </TabItem>
            ) : (
              <AgentItem key={entry.agent.key} id={entryId(entry)} agent={entry.agent} onRefresh={reloadAgents}>
                {appActions}
              </AgentItem>
            ),
          )}
        </List.Section>
      ))}
      {bookmarks.length > 0 && (
        <List.Section title="Bookmarks" subtitle={String(bookmarks.length)}>
          {shownBookmarks.map((bookmark) => (
            <BookmarkItem
              key={bookmark.id}
              bookmark={bookmark}
              tabs={tabs}
              onRemove={() => changeBookmark(bookmark, false)}
              onRename={(title) => renameTo(bookmark.id, title)}
            >
              {appActions}
            </BookmarkItem>
          ))}
        </List.Section>
      )}
      {closed.length > 0 && (
        <List.Section title="Recently Closed" subtitle={String(closed.length)}>
          {shownClosed.map((entry) => (
            <ClosedItem key={entry.id} entry={entry} tabs={tabs} onForget={revalidate}>
              <BookmarkAction entry={entry} bookmarked={bookmarked} onChange={changeBookmark} />
              {appActions}
            </ClosedItem>
          ))}
        </List.Section>
      )}
      {(failures.length > 0 || !accessibility) && (
        <List.Section title="Unavailable">
          {!accessibility && (
            <List.Item
              icon={Icon.Warning}
              title="Windows and Sessions"
              subtitle="Allow Raycast in Accessibility settings"
              actions={
                <ActionPanel>
                  <Action title="Open Accessibility Settings" onAction={() => open(ACCESSIBILITY_SETTINGS)} />
                </ActionPanel>
              }
            />
          )}
          {failures.map(({ app, message }) => (
            <List.Item
              key={`failed-${app.bundleId}`}
              icon={{ fileIcon: app.path }}
              title={app.name}
              subtitle={message}
              accessories={[{ icon: Icon.Warning }]}
              actions={
                <ActionPanel>
                  <Action title="Open Automation Settings" onAction={() => open(AUTOMATION_SETTINGS)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function TabItem({ id, tab, agent, children }: { id: string; tab: Tab; agent?: ListedAgent; children: ReactNode }) {
  return (
    <List.Item
      id={id}
      icon={tab.url ? getFavicon(tab.url, { fallback: Icon.Globe }) : { fileIcon: tab.app.path }}
      title={tab.title}
      accessories={[
        ...(agent && agent.status !== "unknown"
          ? [
              {
                tag: { value: agent.statusDetail ?? STATUS_TITLE[agent.status], color: STATUS_COLOR[agent.status] },
                tooltip: agent.product,
              },
            ]
          : []),
        ...(tab.active ? [{ tag: "Active" }] : []),
        { text: shortDetail(tab), tooltip: tab.detailFull },
        { icon: KIND_ICON[tab.kind], tooltip: tab.kind },
      ]}
      actions={
        <ActionPanel>
          <SwitchAction
            title="Jump to Tab"
            failureTitle={`Could not jump to ${tab.title}`}
            onSwitch={async () => {
              await selectTab(tab, macosPlatform);
              await activateApp(tab.app);
            }}
          />
          {tab.url && <Action.CopyToClipboard title="Copy URL" content={tab.url} />}
          <Action.CopyToClipboard title="Copy Title" content={tab.title} shortcut={Keyboard.Shortcut.Common.Copy} />
          {children}
        </ActionPanel>
      }
    />
  );
}

function ClosedItem({
  entry,
  tabs,
  onForget,
  children,
}: {
  entry: ClosedTab;
  tabs: Tab[];
  onForget: () => void;
  children: ReactNode;
}) {
  const forget = async (id?: string) => {
    await forgetClosed(macosPlatform, id);
    onForget();
  };
  const openTab = openTabFor(entry, tabs);
  return (
    <List.Item
      id={closedId(entry)}
      icon={reopenIcon(entry)}
      title={entry.title}
      subtitle={entry.app.name}
      accessories={[
        ...openTag(openTab),
        { text: closedDetail(entry) },
        { date: new Date(entry.closedAt), tooltip: "Closed" },
      ]}
      actions={
        <ActionPanel>
          <SwitchAction
            title={openTab ? "Jump to Tab" : "Reopen"}
            failureTitle={`Could not reopen ${entry.title}`}
            onSwitch={() => reopenClosed(entry, tabs, macosPlatform, activateApp)}
          />
          {entry.url && <Action.CopyToClipboard title="Copy URL" content={entry.url} />}
          <Action
            title="Remove from Recently Closed"
            icon={Icon.XMarkCircle}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => forget(entry.id)}
          />
          <Action
            title="Clear Recently Closed"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={() => forget()}
          />
          {children}
        </ActionPanel>
      }
    />
  );
}

function BookmarkItem({
  bookmark,
  tabs,
  onRemove,
  onRename,
  children,
}: {
  bookmark: Bookmark;
  tabs: Tab[];
  onRemove: () => Promise<unknown>;
  onRename: (title: string) => Promise<unknown>;
  children: ReactNode;
}) {
  const openTab = openTabFor(bookmark, tabs);
  return (
    <List.Item
      id={bookmarkId(bookmark)}
      icon={reopenIcon(bookmark)}
      title={bookmark.title}
      subtitle={bookmark.app.name}
      accessories={[
        ...openTag(openTab),
        { text: closedDetail(bookmark) },
        { icon: Icon.Bookmark, tooltip: "Bookmark" },
      ]}
      actions={
        <ActionPanel>
          <SwitchAction
            title={openTab ? "Jump to Tab" : "Open Bookmark"}
            failureTitle={`Could not open ${bookmark.title}`}
            onSwitch={() => jumpOrOpen(bookmark, tabs, macosPlatform, activateApp)}
          />
          {bookmark.url && <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />}
          <Action.Push
            title="Rename Bookmark"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<RenameBookmarkForm bookmark={bookmark} onRename={onRename} />}
          />
          <Action
            title="Remove Bookmark"
            icon={Icon.XMarkCircle}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => runChange(onRemove(), "Could not remove bookmark")}
          />
          {children}
        </ActionPanel>
      }
    />
  );
}

/** Bookmarks and Recently Closed: the page's favicon, or the file's icon. */
function reopenIcon(entry: Reopenable & { url?: string }) {
  return entry.url ? getFavicon(entry.url, { fallback: Icon.Globe }) : { fileIcon: entry.reopen.target };
}

/** Marks a bookmark or closed entry that a listed tab shows: picking it jumps there. */
function openTag(openTab: Tab | undefined): List.Item.Accessory[] {
  return openTab ? [{ tag: "Open", tooltip: `Open in ${openTab.app.name}` }] : [];
}

/** A clean name for a bookmark, in place of a long URL or a generic page title. */
function RenameBookmarkForm({
  bookmark,
  onRename,
}: {
  bookmark: Bookmark;
  onRename: (title: string) => Promise<unknown>;
}) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Rename Bookmark"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Bookmark"
            icon={Icon.Pencil}
            onSubmit={({ title }: { title: string }) => {
              if (!title.trim()) return setError("Enter a name");
              pop();
              runChange(onRename(title.trim()), "Could not rename bookmark");
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Name"
        defaultValue={bookmark.title}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description text={bookmark.url ?? bookmark.reopen.target} />
    </Form>
  );
}

/** ⌘D on a tab or Recently Closed entry: bookmark it, or remove its bookmark. Nothing for what can't reopen. */
function BookmarkAction({
  entry,
  bookmarked,
  onChange,
}: {
  entry?: Omit<Bookmark, "addedAt">;
  bookmarked: Set<string>;
  onChange: (entry: Omit<Bookmark, "addedAt">, on: boolean) => Promise<unknown>;
}) {
  if (!entry) return null;
  const on = !bookmarked.has(entry.id);
  return (
    <Action
      title={on ? "Add Bookmark" : "Remove Bookmark"}
      icon={on ? Icon.Bookmark : Icon.XMarkCircle}
      shortcut={{ modifiers: ["cmd"], key: "d" }}
      onAction={() =>
        runChange(onChange(entry, on), on ? "Could not add bookmark" : "Could not remove bookmark", {
          title: on ? "Bookmarked" : "Bookmark removed",
          message: entry.title,
        })
      }
    />
  );
}

/** Shows how a bookmark change went. */
async function runChange(change: Promise<unknown>, failureTitle: string, success?: { title: string; message: string }) {
  try {
    await change;
  } catch (error) {
    await showFailure(error, failureTitle);
    return;
  }
  if (success) await showToast({ style: Toast.Style.Success, ...success });
}

/** A row of Search: a tab, or an agent, in the shape search reads, with its app for grouping. */
type Entry = { title: string; detail?: string; detailFull?: string; url?: string; kind: string; app: App } & (
  { tab: Tab; agent?: undefined } | { agent: ListedAgent; tab?: undefined }
);

const tabEntry = (tab: Tab): Entry => ({
  tab,
  title: tab.title,
  detail: tab.detail,
  detailFull: tab.detailFull,
  url: tab.url,
  kind: tab.kind,
  app: tab.app,
});

const agentEntry = (agent: ListedAgent): Entry => ({
  agent,
  title: agent.title,
  detail: [agent.product, agent.project?.name].filter(Boolean).join(" "),
  kind: "agent",
  app: agent.location!.app,
});

/** Row ids: tabs, agents, bookmarks, and closed entries each have their own keys, so each gets a prefix. */
const entryId = (entry: Entry) => (entry.tab ? `tab:${entry.tab.key}` : `agent:${entry.agent.key}`);
const closedId = (entry: ClosedTab) => `closed:${entry.id}`;
const bookmarkId = (bookmark: Bookmark) => `bookmark:${bookmark.id}`;

/** One section per app, in order of each app's first entry (so the best search match's app comes first). */
function groupByApp(entries: Entry[]): { app: App; entries: Entry[] }[] {
  const sections = new Map<string, { app: App; entries: Entry[] }>();
  for (const entry of entries) {
    const section = sections.get(entry.app.bundleId);
    if (section) section.entries.push(entry);
    else sections.set(entry.app.bundleId, { app: entry.app, entries: [entry] });
  }
  return [...sections.values()];
}

/** Host for pages, the containing folder for files. */
function closedDetail(entry: Pick<ClosedTab, "url" | "detail" | "reopen">): string {
  if (entry.reopen.kind === "url") return shortDetail(entry);
  return entry.reopen.target.split("/").slice(-2, -1)[0] ?? "";
}

/** Host for URLs, otherwise the source's detail (working directory, status...). */
function shortDetail(tab: Pick<Tab, "url" | "detail">): string {
  if (!tab.url) return tab.detail ?? "";
  try {
    return new URL(tab.url).hostname;
  } catch {
    return tab.url;
  }
}
