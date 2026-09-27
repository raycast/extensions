// cmux: window → workspace (the sidebar entry; "tab" in its AppleScript dictionary) → terminals (splits, and tabs
// inside a split). Each workspace is an entry; one with several terminals also lists each terminal by its name,
// with the workspace as detail. Terminals are also the panes agents are located in. AppleScript gives terminal
// ids but neither their tty nor their names (all "Terminal"); cmux's own session file (autosaved on change) has
// both for each terminal ("panel", same id).

import { isTrue, listScript, parseRecords, quote, runSelect, tildify } from "../applescript";
import type { App, Pane, Platform, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  tabId: string;
  /** For an entry that's one terminal of its workspace. */
  terminalId?: string;
}

/** What cmux's session file says about a terminal. */
export interface Panel {
  tty?: string;
  /** The terminal's tab title in cmux (custom title, else its own). */
  title?: string;
}

const SESSION_DIR = "Library/Application Support/cmux";
const SESSION_FILE = /^session-com\.cmuxterm\.app\.json$/;

const LIST = `repeat with win in windows
  set wid to id of win
  repeat with t in tabs of win
    set cwd to ""
    try
      set cwd to working directory of focused terminal of t
    end try
    set focusedId to ""
    try
      set focusedId to id of focused terminal of t
    end try
    set AppleScript's text item delimiters to ","
    set termIds to (id of terminals of t) as text
    set AppleScript's text item delimiters to ""
    set out to out & wid & F & (id of t) & F & (name of t) & F & (selected of t) & F & cwd & F & termIds & F & focusedId & R
  end repeat
end repeat`;

const select = ({ windowId, tabId }: Ref) => `repeat with win in windows
  if (id of win) is ${quote(windowId)} then
    repeat with t in tabs of win
      if (id of t) is ${quote(tabId)} then
        select tab t
        activate window win
        return "ok"
      end if
    end repeat
  end if
end repeat`;

const selectTerminal = (terminalId: string) => `repeat with win in windows
  repeat with t in tabs of win
    repeat with term in terminals of t
      if (id of term) is ${quote(terminalId)} then
        select tab t
        activate window win
        focus term
        return "ok"
      end if
    end repeat
  end repeat
end repeat`;

/** Rows: windowId, tabId, title, selected, workingDirectory, terminal ids (comma-separated), focused terminal id. */
export function parse(app: App, out: string, panels: Map<string, Panel> = new Map()): Tab<Ref>[] {
  return parseRecords(out, 7).flatMap(([windowId, tabId, title, selected, cwd, terminalIds, focusedId]) => {
    const workspace = title || tildify(cwd) || "Workspace";
    const ids = terminalIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const pane = (id: string): Pane[] => {
      const tty = panels.get(id)?.tty;
      return tty ? [{ id, tty }] : [];
    };
    const terminals =
      ids.length > 1
        ? ids.map((id, i): Tab<Ref> => ({
            key: `${app.bundleId}:${tabId}:${id}`,
            app,
            source: cmux.id,
            kind: "tab",
            title: panels.get(id)?.title || `${workspace} ${i + 1}`,
            detail: workspace,
            detailFull: tildify(cwd) || undefined,
            active: isTrue(selected) && id === focusedId,
            ref: { windowId, tabId, terminalId: id },
            panes: pane(id),
          }))
        : [];
    // With terminal entries, agents are located in those; the workspace keeps its panes only when it's one terminal.
    const panes = terminals.length > 0 ? [] : ids.flatMap(pane);
    return [
      {
        key: `${app.bundleId}:${tabId}`,
        app,
        source: cmux.id,
        kind: "workspace",
        title: workspace,
        detail: tildify(cwd) || undefined,
        active: isTrue(selected) && terminals.length === 0,
        ref: { windowId, tabId },
        ...(panes.length > 0 ? { panes } : {}),
      },
      ...terminals,
    ];
  });
}

/** Terminal id → tty and title, from cmux's session file; empty if it's unreadable. */
export function parsePanels(text: string): Map<string, Panel> {
  const panels = new Map<string, Panel>();
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  try {
    for (const win of JSON.parse(text)?.windows ?? []) {
      for (const workspace of win?.tabManager?.workspaces ?? []) {
        for (const panel of workspace?.panels ?? []) {
          if (typeof panel?.id !== "string") continue;
          panels.set(panel.id, { tty: str(panel.ttyName), title: str(panel.customTitle) ?? str(panel.title) });
        }
      }
    }
  } catch {
    // Unreadable session file: no panes or terminal names; workspaces still list.
  }
  return panels;
}

async function readPanels(platform: Platform): Promise<Map<string, Panel>> {
  const [file] = await platform.readFiles(`${platform.homeDir()}/${SESSION_DIR}`, SESSION_FILE, 0);
  return file ? parsePanels(file.text) : new Map();
}

export const cmux: TabSource<Ref> = {
  id: "cmux",
  bundleIds: ["com.cmuxterm.app"],
  list: async (app, platform) => {
    const [out, panels] = await Promise.all([
      platform.runAppleScript(listScript(app.bundleId, LIST)),
      readPanels(platform).catch(() => new Map<string, Panel>()),
    ]);
    return parse(app, out, panels);
  },
  select: (tab, platform) =>
    runSelect(platform, tab.app.bundleId, tab.ref.terminalId ? selectTerminal(tab.ref.terminalId) : select(tab.ref)),
  selectPane: (tab, paneId, platform) => runSelect(platform, tab.app.bundleId, selectTerminal(paneId)),
};
