// iTerm: one entry per tab, identified by its current session's id.

import { isTrue, listScript, parseRecords, quote, runSelect } from "../applescript";
import type { App, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  sessionId: string;
}

const LIST = `repeat with win in windows
  set wid to id of win
  set curId to id of current session of current tab of win
  repeat with t in tabs of win
    set s to current session of t
    set out to out & wid & F & (id of s) & F & (name of s) & F & ((id of s) = curId) & R
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

/** Rows: windowId, sessionId, title, active. */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 4).map(([windowId, sessionId, title, active]) => ({
    key: `${app.bundleId}:${sessionId}`,
    app,
    source: iterm.id,
    kind: "tab",
    title: title || "Shell",
    active: isTrue(active),
    ref: { windowId, sessionId },
  }));
}

export const iterm: TabSource<Ref> = {
  id: "iterm",
  bundleIds: ["com.googlecode.iterm2"],
  list: async (app, platform) => parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST))),
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
};
