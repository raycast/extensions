// Terminal.app: tabs have no id or title of their own; the tty identifies them, the process names them.

import { isTrue, listScript, parseRecords, quote, runSelect } from "../applescript";
import type { App, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  tty: string;
}

const LIST = `repeat with win in windows
  set wid to id of win
  repeat with t in tabs of win
    set AppleScript's text item delimiters to ","
    set procs to (processes of t) as text
    set AppleScript's text item delimiters to ""
    set out to out & wid & F & (custom title of t) & F & (tty of t) & F & (selected of t) & F & procs & R
  end repeat
end repeat`;

const select = ({ windowId, tty }: Ref) => `set win to window id ${Number(windowId)}
repeat with t in tabs of win
  if (tty of t) is ${quote(tty)} then
    set selected of t to true
    set index of win to 1
    return "ok"
  end if
end repeat`;

/** Rows: windowId, customTitle, tty, selected, processes (comma-separated, foreground last). */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 5).map(([windowId, customTitle, tty, selected, processes]) => {
    const foreground = processes.split(",").pop()?.trim() ?? "";
    return {
      key: `${app.bundleId}:${tty}`,
      app,
      source: terminal.id,
      kind: "tab",
      title: customTitle || foreground || tty,
      detail: tty,
      active: isTrue(selected),
      ref: { windowId, tty },
    };
  });
}

export const terminal: TabSource<Ref> = {
  id: "terminal",
  bundleIds: ["com.apple.Terminal"],
  list: async (app, platform) => parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST))),
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
};
