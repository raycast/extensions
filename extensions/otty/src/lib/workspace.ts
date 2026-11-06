// Pure helpers for reading Otty's window/tab/pane state. No @raycast/api import,
// so vitest can exercise everything here.

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

/** One list row, whether it stands for a pane, a tab, or a window. */
export type Row = {
  id: string;
  title: string;
  subtitle?: string;
  /** A compact count for the accessory: "(2)" panes in a tab, "1 of 2" for a pane. */
  label?: string;
  /** The same count spelled out, for the tooltip and the details panel. */
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

export function buildListArgs(kind: "window" | "tab" | "pane"): string[] {
  return [kind, "list", "--json"];
}

export function buildFocusPaneArgs(paneId: string): string[] {
  return ["pane", "focus", paneId];
}

export function buildPaneLinkArgs(paneId: string): string[] {
  return ["pane", "link", "--pane", paneId];
}

export function buildCaptureArgs(paneId: string, lines: number): string[] {
  return ["pane", "capture", "--pane", paneId, "--lines", String(lines), "--trim"];
}

/** Queue text on the pane's Prompt Queue, sent verbatim (no escape processing). */
export function buildSendTextArgs(paneId: string, text: string): string[] {
  return ["pane", "send-text", "--pane", paneId, "--no-escape", "--submit", "--", text];
}

/** Unwrap Otty's `{ ok, data }` JSON envelope. */
export function parseOttyJson<T>(stdout: string): T {
  let envelope: { ok?: boolean; data?: T; error?: unknown };
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error(`Unexpected output from Otty CLI: ${stdout.slice(0, 200)}`);
  }
  if (envelope.ok === false) {
    throw new Error(
      typeof envelope.error === "string"
        ? envelope.error
        : JSON.stringify(envelope.error ?? "Otty CLI reported an error"),
    );
  }
  return envelope.data as T;
}

/** Expand a leading `~`, as typed into a preference; blank means unset. */
export function expandHome(path: string | undefined, home: string): string | undefined {
  const trimmed = path?.trim();
  return trimmed ? trimmed.replace(/^~(?=$|\/)/, home) : undefined;
}

export function abbreviateHome(path: string, home: string): string {
  if (path === home) return "~";
  if (path.startsWith(`${home}/`)) return `~${path.slice(home.length)}`;
  return path;
}

// A shell's default terminal title is `user@host:path`.
const PROMPT_PREFIX = /^[^\s@]+@[^\s:]+:/;
// Commands launched into a pane are often prefixed with `cd <dir> &&`.
const CD_PREFIX = /^cd\s+(?:"[^"]*"|'[^']*'|\S+)\s*&&\s*/;

export function paneTitle(pane: OttyPane, tab: OttyTab | undefined): string {
  if (pane.agent) return pane.process.trim() || tab?.title || "Agent";

  if (PROMPT_PREFIX.test(pane.process)) return "Shell";

  return pane.process.replace(CD_PREFIX, "").trim() || tab?.title || "Shell";
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

/** The state that most needs attention: awaiting, then working, starting, idle. */
export function mostUrgentState(states: AgentState[]): AgentState {
  return URGENCY.find((state) => states.includes(state)) ?? "";
}

/** Wrap text in a `text` code fence that no backtick run inside it can close. */
export function fenceText(text: string): string {
  const longestRun = Math.max(0, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `${fence}text\n${text}\n${fence}`;
}

/**
 * The row whose sidebar captures its pane. `undefined` means Raycast hasn't
 * reported a selection yet (use the first row); `null` means a search filtered
 * every row out (none).
 */
export function activeRowId(sections: Section[], selectedId: string | null | undefined): string | undefined {
  return selectedId === undefined ? sections[0]?.rows[0]?.id : (selectedId ?? undefined);
}

/**
 * The sidebar preview's markdown. A failed refresh after a good capture keeps
 * the last text but says it is no longer live.
 */
export function previewMarkdown({ paneId, data, error }: { paneId?: string; data?: string; error?: unknown }): string {
  if (!paneId) return "No pane to preview.";
  const errorMessage = error ? (error instanceof Error ? error.message : String(error)) : undefined;
  if (data === undefined) return errorMessage ? `# Error\n\n${errorMessage}` : "";
  const text = cleanCapture(data);
  const body = text ? fenceText(text) : "*Pane is empty.*";
  return errorMessage ? `**Preview stopped refreshing:** ${errorMessage}\n\n${body}` : body;
}

/**
 * Tidy captured pane text for the sidebar: drop lines that are only rules
 * (`─────`, `_____`), strip a prompt's `·····` filler, shorten rule runs inside
 * a line, and collapse blank runs.
 */
export function cleanCapture(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw
      .replace(/\s*·{3,}/g, "")
      .replace(/[─━═]{3,}/g, "──")
      .trimEnd();
    const isRule = /^[\s─━═_—-]+$/.test(line) && line.trim().length >= 2;
    if (isRule) continue;
    if (line === "" && (lines.length === 0 || lines[lines.length - 1] === "")) {
      continue;
    }
    lines.push(line);
  }
  while (lines[lines.length - 1] === "") lines.pop();
  return lines.join("\n");
}

/**
 * The sidebar's two parts, preview and details, can't both be hidden: the one
 * still showing can't be toggled off, and a stored state with both hidden
 * brings the preview back.
 */
export function sidebarToggles(stored: { preview: boolean; details: boolean }) {
  const preview = stored.preview || !stored.details;
  const { details } = stored;
  return {
    preview,
    details,
    canTogglePreview: !preview || details,
    canToggleDetails: !details || preview,
  };
}

const RECENT_LIMIT = 5;

/**
 * Pull rows visited from Raycast into a "Recent" section on top, newest first,
 * and remove them from their window sections so nothing appears twice. Ids that
 * no longer exist (a closed tab) are skipped.
 */
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

/** Record a visit: move `id` to the front, deduped, keeping at most `max`. */
export function pushRecent(ids: string[], id: string, max = 50): string[] {
  return [id, ...ids.filter((existing) => existing !== id)].slice(0, max);
}

const MENU_TITLE_LIMIT = 40;

/** A compact menu bar label: a capped title, and the folder only if it adds something. */
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

export function basename(path: string): string {
  return path.split("/").filter(Boolean).pop() ?? path;
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
 * Build the list for one view mode, ordered as Otty's sidebar shows it.
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
  const panesByTab = groupBy(panes, (pane) => pane.tab_id);
  const activePane = (tabId: string) => {
    const tabPanes = panesByTab.get(tabId) ?? [];
    return tabPanes.find((pane) => pane.active) ?? tabPanes[0];
  };
  // Tab and window rows carry the most urgent state below them and the agent in that state.
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

  if (mode === "windows") {
    const panesByWindow = groupBy(panes, (pane) => pane.window_id);
    const rows = orderedWindows.flatMap((window): Row[] => {
      const windowPanes = panesByWindow.get(window.id) ?? [];
      if (windowPanes.length === 0) return [];
      const windowTabs = tabs.filter((tab) => tab.window_id === window.id);
      const activeTab = windowTabs.find((tab) => tab.active) ?? windowTabs[0];
      return [
        {
          id: window.id,
          title: window.title,
          subtitle: `${countOf(windowTabs.length, "tab")} · ${countOf(windowPanes.length, "pane")}`,
          ...rollup(windowPanes),
          focusArgs: ["window", "focus", window.id],
          paneId: activeTab ? activePane(activeTab.id)?.id : undefined,
          cwd: activeTab?.cwd,
          keywords: windowTabs.map((tab) => tab.title),
        },
      ];
    });
    return rows.length > 0 ? [{ id: "windows", rows }] : [];
  }

  const sections: Section[] = [];
  for (const window of orderedWindows) {
    const rows = mode === "tabs" ? tabRows(window.id) : paneRows(panes.filter((pane) => pane.window_id === window.id));
    if (rows.length === 0) continue;
    sections.push({
      id: window.id,
      title: window.title,
      subtitle: countOf(rows.length, mode === "tabs" ? "tab" : "pane"),
      rows,
    });
  }
  return sections;

  function tabRows(windowId: string): Row[] {
    return tabs
      .filter((tab) => tab.window_id === windowId)
      .sort(byIndex)
      .map((tab) => {
        const status = rollup(panesByTab.get(tab.id) ?? []);
        return {
          id: tab.id,
          title: tab.title,
          subtitle: abbreviateHome(tab.cwd, home) || undefined,
          ...(tab.pane_count > 1
            ? {
                label: `(${tab.pane_count})`,
                labelTooltip: countOf(tab.pane_count, "pane"),
              }
            : {}),
          ...status,
          focusArgs: ["tab", "focus", tab.id],
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
          focusArgs: buildFocusPaneArgs(pane.id),
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
