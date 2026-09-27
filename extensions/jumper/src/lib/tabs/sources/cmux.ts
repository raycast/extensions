// cmux calls its tabs "workspaces"; its AppleScript dictionary gives them stable ids.

import { isTrue, listScript, parseRecords, quote, runSelect, tildify } from "../applescript";
import type { App, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  tabId: string;
}

const LIST = `repeat with win in windows
  set wid to id of win
  repeat with t in tabs of win
    set cwd to ""
    try
      set cwd to working directory of focused terminal of t
    end try
    set out to out & wid & F & (id of t) & F & (name of t) & F & (selected of t) & F & cwd & R
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

/** Rows: windowId, tabId, title, selected, workingDirectory. */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 5).map(([windowId, tabId, title, selected, cwd]) => ({
    key: `${app.bundleId}:${tabId}`,
    app,
    source: cmux.id,
    kind: "workspace",
    title: title || tildify(cwd) || "Workspace",
    detail: tildify(cwd) || undefined,
    active: isTrue(selected),
    ref: { windowId, tabId },
  }));
}

export const cmux: TabSource<Ref> = {
  id: "cmux",
  bundleIds: ["com.cmuxterm.app"],
  list: async (app, platform) => parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST))),
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
};
