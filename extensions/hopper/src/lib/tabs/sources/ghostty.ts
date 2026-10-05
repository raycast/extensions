// Ghostty 1.3+ (AppleScript; older versions have none and fall back to windows): window → tab → terminals
// (splits). One entry per tab; its terminals are its panes. Ghostty doesn't report a terminal's tty, so panes
// carry their working folder instead, which locates an agent only when one terminal of the app is in its folder
// (agents/locate.ts). herdr's client is found exactly by title (focusTerminalNamed, used by herdr.ts).

import { isTrue, listScript, parseRecords, quote, runSelect, tildify } from "../applescript";
import type { App, Pane, Platform, Tab, TabSource } from "../model";
import { windows } from "./windows";

export const GHOSTTY = "com.mitchellh.ghostty";

/** AppleScript errors of an app without these terms: -1708 (doesn't understand), -1728 (can't get). */
const NOT_SCRIPTABLE = /-1708|-1728|doesn.t understand|Can.t get/;

interface Ref {
  windowId: string;
  tabId: string;
}

// Terminals are listed as "<id>=<cwd>" joined by GS (29): paths can hold commas.
const LIST = `set G to character id 29
repeat with win in windows
  set wid to id of win
  repeat with t in tabs of win
    set panes to ""
    repeat with term in terminals of t
      set cwd to ""
      try
        set cwd to working directory of term
      end try
      set panes to panes & (id of term) & "=" & cwd & G
    end repeat
    set cur to ""
    try
      set cur to working directory of focused terminal of t
    end try
    set out to out & wid & F & (id of t) & F & (name of t) & F & (selected of t) & F & cur & F & panes & R
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

const focusTerminal = (condition: string) => `repeat with win in windows
  repeat with t in tabs of win
    repeat with term in terminals of t
      if ${condition} then
        select tab t
        activate window win
        focus term
        return "ok"
      end if
    end repeat
  end repeat
end repeat`;

/** Rows: windowId, tabId, title, selected, focused terminal's folder, terminals ("<id>=<cwd>" per GS). */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 6).map(([windowId, tabId, title, selected, cwd, terminals]) => ({
    key: `${app.bundleId}:${tabId}`,
    app,
    source: ghostty.id,
    kind: "tab",
    title: title || tildify(cwd) || "Terminal",
    detail: tildify(cwd) || undefined,
    active: isTrue(selected),
    ref: { windowId, tabId },
    panes: terminals.split("\u001d").flatMap((entry): Pane[] => {
      const split = entry.indexOf("=");
      const id = entry.slice(0, split).trim();
      const folder = entry.slice(split + 1).trim();
      return split > 0 && id ? [{ id, ...(folder ? { cwd: folder } : {}) }] : [];
    }),
  }));
}

/**
 * Focus the terminal whose title is `name` (and its tab and window), retrying briefly: a title just set by the
 * program in it takes a moment to reach Ghostty. False if there's none.
 */
export async function focusTerminalNamed(platform: Platform, name: string): Promise<boolean> {
  const result = await platform.runAppleScript(`tell application id ${quote(GHOSTTY)}
repeat 10 times
${focusTerminal(`(name of term as text) is ${quote(name)}`)}
delay 0.03
end repeat
end tell
return "missing"`);
  return result === "ok";
}

export const ghostty: TabSource<Ref> = {
  id: "ghostty",
  bundleIds: [GHOSTTY],
  list: async (app, platform) => {
    try {
      return parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST)));
    } catch (error) {
      // Ghostty before 1.3 has no scripting ("doesn't understand"): list its windows, as for any other app.
      if (!NOT_SCRIPTABLE.test(error instanceof Error ? error.message : String(error))) throw error;
      return (await windows.list(app, platform)) as Tab[] as Tab<Ref>[];
    }
  },
  // Fallback entries carry source "windows", so their selection is routed there, not here.
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
  selectPane: (tab, paneId, platform) =>
    runSelect(platform, tab.app.bundleId, focusTerminal(`(id of term) is ${quote(paneId)}`)),
};
