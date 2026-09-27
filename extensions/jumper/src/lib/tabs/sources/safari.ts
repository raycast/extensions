// Safari tabs have no id: remember window id + position, and the URL to catch a tab that moved.

import { isTrue, listScript, parseRecords, quote, runSelect } from "../applescript";
import type { App, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  index: number;
  url: string;
}

const LIST = `repeat with win in windows
  try
    set wid to id of win
    set cur to index of current tab of win
    set names to name of tabs of win
    set urls to URL of tabs of win
    repeat with i from 1 to count names
      set out to out & wid & F & i & F & (item i of names) & F & (item i of urls) & F & (i = cur) & R
    end repeat
  end try
end repeat`;

// Prefer the remembered position if its URL still matches; otherwise find the URL anywhere in the window.
const select = ({ windowId, index, url }: Ref) => `set win to window id ${Number(windowId)}
set target to missing value
try
  if (URL of tab ${index} of win) is ${quote(url)} then set target to tab ${index} of win
end try
if target is missing value then
  repeat with t in tabs of win
    if (URL of t) is ${quote(url)} then
      set target to t
      exit repeat
    end if
  end repeat
end if
if target is missing value then return "missing"
set current tab of win to target
set index of win to 1
return "ok"`;

/** Rows: windowId, index, title, url, active. */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 5).map(([windowId, index, title, url, active]) => ({
    key: `${app.bundleId}:${windowId}:${index}`,
    app,
    source: safari.id,
    kind: "tab",
    title: title || url || "Untitled",
    detail: url,
    url: url || undefined,
    active: isTrue(active),
    ref: { windowId, index: Number(index), url },
  }));
}

export const safari: TabSource<Ref> = {
  id: "safari",
  bundleIds: ["com.apple.Safari"],
  list: async (app, platform) => parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST))),
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
};
