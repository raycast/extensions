// iTerm: one entry per tab, identified by its current session's id. A tab's sessions (split panes) are its
// panes, with their tty, so an agent running in any split can be jumped to exactly.

import { isTrue, listScript, parseRecords, quote, runSelect } from "../applescript";
import type { App, Pane, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  sessionId: string;
}

const LIST = `repeat with win in windows
  set wid to id of win
  set curId to id of current session of current tab of win
  repeat with t in tabs of win
    set s to current session of t
    set panes to ""
    repeat with p in sessions of t
      set panes to panes & (id of p) & "=" & (tty of p) & ","
    end repeat
    set out to out & wid & F & (id of s) & F & (name of s) & F & ((id of s) = curId) & F & panes & R
  end repeat
end repeat`;

const select = ({ windowId, sessionId }: Ref) => `set win to window id ${Number(windowId)}
repeat with t in tabs of win
  if (id of current session of t) is ${quote(sessionId)} then
    select t
    select win
    return "ok"
  end if
end repeat`;

const selectSession = (sessionId: string) => `repeat with win in windows
  repeat with t in tabs of win
    repeat with s in sessions of t
      if (id of s) is ${quote(sessionId)} then
        select s
        select t
        select win
        return "ok"
      end if
    end repeat
  end repeat
end repeat`;

/** Rows: windowId, sessionId, title, active, panes ("<sessionId>=<tty>," per session). */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 5).map(([windowId, sessionId, title, active, panes]) => ({
    key: `${app.bundleId}:${sessionId}`,
    app,
    source: iterm.id,
    kind: "tab",
    title: title || "Shell",
    active: isTrue(active),
    ref: { windowId, sessionId },
    panes: parsePanes(panes),
  }));
}

function parsePanes(field: string): Pane[] {
  return field.split(",").flatMap((entry): Pane[] => {
    const [id, tty] = entry.split("=");
    return id?.trim() && tty?.trim() ? [{ id: id.trim(), tty: tty.trim().replace(/^\/dev\//, "") }] : [];
  });
}

export const iterm: TabSource<Ref> = {
  id: "iterm",
  bundleIds: ["com.googlecode.iterm2"],
  list: async (app, platform) => parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST))),
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
  selectPane: (tab, paneId, platform) => runSelect(platform, tab.app.bundleId, selectSession(paneId)),
};
