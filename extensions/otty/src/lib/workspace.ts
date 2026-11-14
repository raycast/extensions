import { buildFocusArgs } from "./otty-core";
import { abbreviateHome, basename } from "./paths";

export type OttyWindow = {
  id: string;
  index: number;
  title: string;
  focused: boolean;
  tab_count: number;
  pane_count: number;
};

export type OttyTab = {
  id: string;
  window_id: string;
  index: number;
  title: string;
  cwd: string;
  process: string;
  active: boolean;
  pane_count: number;
};

export type AgentState = "processing" | "idle" | "awaiting" | "unknown" | "";

export type OttyPane = {
  id: string;
  tab_id: string;
  window_id: string;
  index: number;
  active: boolean;
  cwd: string;
  process: string;
  agent: string;
  agent_session_id: string;
  agent_state: AgentState;
  cols: number;
  rows: number;
};

export type ViewMode = "tabs" | "panes" | "windows";

export type Row = {
  id: string;
  title: string;
  subtitle?: string;
  /** A compact count for the accessory: "(2)" panes in a tab, "1 of 2" for a pane. */
  label?: string;
  labelTooltip?: string;
  agent: string;
  agentState: AgentState;
  focusArgs: string[];
  /** The pane to preview and message: the row's own, or its tab's active one. */
  paneId?: string;
  cwd?: string;
  keywords: string[];
};

export type Section = {
  id: string;
  title?: string;
  subtitle?: string;
  rows: Row[];
};

export type AgentTone = "orange" | "blue" | "default" | "secondary";

// A shell's default terminal title is `user@host:path`.
const PROMPT_PREFIX = /^[^\s@]+@[^\s:]+:/;
// Commands launched into a pane are often prefixed with `cd <dir> &&`.
const CD_PREFIX = /^cd\s+(?:"[^"]*"|'[^']*'|\S+)\s*&&\s*/;

/** With terminal titles off (or not yet set), Otty reports an empty title; name it by its folder, as Otty's sidebar does. */
export function tabTitle(tab: OttyTab): string {
  return tab.title.trim() || basename(tab.cwd) || "Tab";
}

export function paneTitle(pane: OttyPane, tab: OttyTab | undefined): string {
  const fallback = tab?.title.trim() || basename(pane.cwd);
  if (pane.agent) return pane.process.trim() || fallback || "Agent";

  if (PROMPT_PREFIX.test(pane.process)) return "Shell";

  return pane.process.replace(CD_PREFIX, "").trim() || fallback || "Shell";
}

export function agentStatus(state: AgentState): { label: string; tone: AgentTone } | undefined {
  switch (state) {
    case "awaiting":
      return { label: "Needs Input", tone: "orange" };
    case "processing":
      return { label: "Working", tone: "blue" };
    case "idle":
      return { label: "Idle", tone: "default" };
    case "unknown":
      return { label: "Starting", tone: "secondary" };
    default:
      return undefined;
  }
}

const URGENCY: AgentState[] = ["awaiting", "processing", "unknown", "idle"];

export function mostUrgentState(states: AgentState[]): AgentState {
  return URGENCY.find((state) => states.includes(state)) ?? "";
}

const RECENT_LIMIT = 5;

export function withRecent(sections: Section[], recentIds: string[], limit = RECENT_LIMIT): Section[] {
  const rowsById = new Map(sections.flatMap((section) => section.rows).map((row) => [row.id, row]));
  const recent = recentIds
    .map((id) => rowsById.get(id))
    .filter((row): row is Row => Boolean(row))
    .slice(0, limit);
  if (recent.length === 0) return sections;
  const shown = new Set(recent.map((row) => row.id));
  return [
    { id: "recent", title: "Recent", rows: recent },
    ...sections
      .map((section) => ({
        ...section,
        rows: section.rows.filter((row) => !shown.has(row.id)),
      }))
      .filter((section) => section.rows.length > 0),
  ];
}

export function pushRecent(ids: string[], id: string, max = 50): string[] {
  return [id, ...ids.filter((existing) => existing !== id)].slice(0, max);
}

const MENU_TITLE_LIMIT = 40;

export function menuLabel(row: Pick<Row, "title" | "cwd">): {
  title: string;
  subtitle?: string;
} {
  const title = row.title.length > MENU_TITLE_LIMIT ? `${row.title.slice(0, MENU_TITLE_LIMIT - 1)}…` : row.title;
  const folder = row.cwd ? basename(row.cwd) : undefined;
  return {
    title,
    subtitle: folder && folder.toLowerCase() !== row.title.toLowerCase() ? folder : undefined,
  };
}

export function countOf(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

function placeholderWindow(id: string): OttyWindow {
  return {
    id,
    index: Number.MAX_SAFE_INTEGER,
    title: "Window",
    focused: false,
    tab_count: 0,
    pane_count: 0,
  };
}

const byIndex = (a: { index: number }, b: { index: number }) => a.index - b.index;

/**
 * The three lists come from separate CLI calls, so a pane can outlive its tab or
 * window between reads; such panes are kept rather than dropped.
 */
export function buildSections(
  mode: ViewMode,
  windows: OttyWindow[],
  tabs: OttyTab[],
  panes: OttyPane[],
  home: string,
): Section[] {
  const tabsById = new Map(tabs.map((tab) => [tab.id, tab]));
  const tabsByWindow = groupBy(tabs, (tab) => tab.window_id);
  const panesByTab = groupBy(panes, (pane) => pane.tab_id);
  const panesByWindow = groupBy(panes, (pane) => pane.window_id);
  const activePane = (tabId: string) => {
    const tabPanes = panesByTab.get(tabId) ?? [];
    return tabPanes.find((pane) => pane.active) ?? tabPanes[0];
  };
  const rollup = (group: OttyPane[]) => {
    const agentState = mostUrgentState(group.map((pane) => pane.agent_state));
    // Name the agent whose state is the one shown, not just the first agent.
    const pane = group.find((p) => p.agent && p.agent_state === agentState) ?? group.find((p) => p.agent);
    return { agent: pane?.agent ?? "", agentState };
  };

  const windowsById = new Map(windows.map((window) => [window.id, window]));
  for (const pane of panes) {
    if (!windowsById.has(pane.window_id)) {
      windowsById.set(pane.window_id, placeholderWindow(pane.window_id));
    }
  }
  const orderedWindows = [...windowsById.values()].sort(byIndex);
  const activeTab = (windowId: string) => {
    const windowTabs = tabsByWindow.get(windowId) ?? [];
    return windowTabs.find((tab) => tab.active) ?? windowTabs[0];
  };
  const windowTitle = (window: OttyWindow) => {
    const tab = activeTab(window.id);
    return window.title.trim() || (tab ? tabTitle(tab) : "") || "Window";
  };

  if (mode === "windows") {
    const rows = orderedWindows.flatMap(windowRows);
    return rows.length > 0 ? [{ id: "windows", rows }] : [];
  }

  const sections: Section[] = [];
  for (const window of orderedWindows) {
    const rows = mode === "tabs" ? tabRows(window.id) : paneRows(panesByWindow.get(window.id) ?? []);
    if (rows.length === 0) continue;
    sections.push({
      id: window.id,
      title: windowTitle(window),
      subtitle: countOf(rows.length, mode === "tabs" ? "tab" : "pane"),
      rows,
    });
  }
  return sections;

  function windowRows(window: OttyWindow): Row[] {
    const windowPanes = panesByWindow.get(window.id) ?? [];
    if (windowPanes.length === 0) return [];
    const windowTabs = tabsByWindow.get(window.id) ?? [];
    const tab = activeTab(window.id);
    return [
      {
        id: window.id,
        title: windowTitle(window),
        subtitle: `${countOf(windowTabs.length, "tab")} · ${countOf(windowPanes.length, "pane")}`,
        ...rollup(windowPanes),
        focusArgs: buildFocusArgs("window", window.id),
        paneId: tab ? activePane(tab.id)?.id : undefined,
        cwd: tab?.cwd,
        keywords: windowTabs.map((tab) => tab.title),
      },
    ];
  }

  function tabRows(windowId: string): Row[] {
    return [...(tabsByWindow.get(windowId) ?? [])].sort(byIndex).map((tab) => {
      const status = rollup(panesByTab.get(tab.id) ?? []);
      return {
        id: tab.id,
        title: tabTitle(tab),
        subtitle: abbreviateHome(tab.cwd, home) || undefined,
        ...(tab.pane_count > 1
          ? {
              label: `(${tab.pane_count})`,
              labelTooltip: countOf(tab.pane_count, "pane"),
            }
          : {}),
        ...status,
        focusArgs: buildFocusArgs("tab", tab.id),
        paneId: activePane(tab.id)?.id,
        cwd: tab.cwd || undefined,
        keywords: [basename(tab.cwd), status.agent].filter(Boolean),
      };
    });
  }

  function paneRows(windowPanes: OttyPane[]): Row[] {
    return [...windowPanes]
      .sort((a, b) => {
        const tabA = tabsById.get(a.tab_id)?.index ?? Number.MAX_SAFE_INTEGER;
        const tabB = tabsById.get(b.tab_id)?.index ?? Number.MAX_SAFE_INTEGER;
        return tabA - tabB || a.index - b.index;
      })
      .map((pane) => {
        const tab = tabsById.get(pane.tab_id);
        const title = paneTitle(pane, tab);
        const cwd = abbreviateHome(pane.cwd, home);
        const subtitle = cwd && cwd !== title ? cwd : tab?.title;
        const paneCount = tab?.pane_count ?? 1;
        return {
          id: pane.id,
          title,
          subtitle: subtitle !== title ? subtitle : undefined,
          ...(paneCount > 1
            ? {
                label: `${pane.index + 1} of ${paneCount}`,
                labelTooltip: `Pane ${pane.index + 1} of ${paneCount}`,
              }
            : {}),
          agent: pane.agent,
          agentState: pane.agent_state,
          focusArgs: buildFocusArgs("pane", pane.id),
          paneId: pane.id,
          cwd: pane.cwd || undefined,
          keywords: [tab?.title, basename(pane.cwd), pane.agent].filter((value): value is string => Boolean(value)),
        };
      });
  }
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}
