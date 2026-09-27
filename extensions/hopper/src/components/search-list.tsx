import { Action, ActionPanel, Icon, Keyboard, List, open } from "@raycast/api";
import { getFavicon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { activateApp, getRecentApps } from "../lib/platform/macos";
import { macosPlatform } from "../lib/platform/os";
import { forgetClosed, recordHistory, reopenClosed, type ClosedTab } from "../lib/tabs/history";
import { loadTabs, selectTab } from "../lib/tabs/load";
import type { App, Tab, TabKind } from "../lib/tabs/model";
import { searchTabs } from "../lib/tabs/search";
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
  const closed = await recordHistory(macosPlatform, result.tabs, covered, Date.now());
  return {
    ...result,
    closed: scope === "all" ? closed : closed.filter((c) => c.app.bundleId === recent[0]?.bundleId),
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
  // looks the tab up again and reports it if it's gone.
  const { data, isLoading, revalidate } = useCachedPromise(load, [scope], { keepPreviousData: true });
  const { tabs = [], closed = [], failures = [], accessibility = true, current } = data ?? {};
  // Agents: read after the tabs, which it reuses to locate them, so the list shows first.
  const { data: agentData, revalidate: reloadAgents } = useCachedPromise(
    (read: Tab[]) => loadAllAgents({ tabs: read }),
    [tabs],
    { execute: tabs.length > 0, keepPreviousData: true },
  );
  const agentByTab = new Map(
    (agentData?.agents ?? []).flatMap((a) => {
      const key = placeOf(a);
      return key ? [[key, a] as const] : [];
    }),
  );
  // Every located agent also has a row of its own in its app's section, so searching its name finds it; except
  // where its tab already says the same (a Claude Code session is both a tab and an agent, same title).
  const tabTitles = new Map(tabs.map((t) => [t.key, t.title]));
  const agents = (agentData?.agents ?? []).filter((a) => {
    if (!a.location || (scope === "current" && a.location.app.bundleId !== current?.bundleId)) return false;
    const place = placeOf(a);
    return !(place && tabTitles.get(place) === a.title);
  });
  const entries: Entry[] = [...tabs.map(tabEntry), ...agents.map(agentEntry)];

  // Own filtering (ADR-015): typo-tolerant, and ranks an app's own tabs above tabs that mention its name.
  const [query, setQuery] = useState("");

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={
        scope === "current" && current ? `Search ${current.name}` : "Search apps, tabs, sessions, and agents"
      }
    >
      {groupByApp(searchTabs(entries, query)).map(({ app, entries }) => (
        <List.Section key={app.bundleId} title={app.name} subtitle={String(entries.length)}>
          {entries.map((entry) =>
            entry.tab ? (
              <TabItem key={entry.tab.key} tab={entry.tab} agent={agentByTab.get(entry.tab.key)} />
            ) : (
              <AgentItem key={entry.agent.key} agent={entry.agent} onRefresh={reloadAgents} />
            ),
          )}
        </List.Section>
      ))}
      {closed.length > 0 && (
        <List.Section title="Recently Closed" subtitle={String(closed.length)}>
          {searchTabs(closed, query).map((entry) => (
            <ClosedItem key={entry.id} entry={entry} onForget={revalidate} />
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

function TabItem({ tab, agent }: { tab: Tab; agent?: ListedAgent }) {
  return (
    <List.Item
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
        </ActionPanel>
      }
    />
  );
}

function ClosedItem({ entry, onForget }: { entry: ClosedTab; onForget: () => void }) {
  const forget = async (id?: string) => {
    await forgetClosed(macosPlatform, id);
    onForget();
  };
  return (
    <List.Item
      icon={entry.url ? getFavicon(entry.url, { fallback: Icon.Globe }) : { fileIcon: entry.reopen.target }}
      title={entry.title}
      subtitle={entry.app.name}
      accessories={[{ text: closedDetail(entry) }, { date: new Date(entry.closedAt), tooltip: "Closed" }]}
      actions={
        <ActionPanel>
          <SwitchAction
            title="Reopen"
            failureTitle={`Could not reopen ${entry.title}`}
            onSwitch={() => reopenClosed(entry, macosPlatform)}
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
        </ActionPanel>
      }
    />
  );
}

/** Key of the tab that shows an agent: where it was located, or the tab its source says shows it. */
function placeOf(agent: ListedAgent): string | undefined {
  return agent.location?.tab?.key ?? agent.placeKey;
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
function closedDetail(entry: ClosedTab): string {
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
