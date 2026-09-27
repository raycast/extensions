// Chromium browsers share Chrome's AppleScript dictionary. Tab ids are stable until the tab closes.

import { isTrue, listScript, parseRecords, quote, runSelect } from "../applescript";
import type { App, Tab, TabSource } from "../model";

interface Ref {
  tabId: string;
}

// Bulk property reads: one Apple Event per property per window instead of several per tab (~1s -> ~0.1s for 25 tabs).
const LIST = `repeat with win in windows
  set activeId to id of active tab of win
  set ids to id of tabs of win
  set titles to title of tabs of win
  set urls to URL of tabs of win
  repeat with i from 1 to count ids
    set out to out & (item i of ids) & F & (item i of titles) & F & (item i of urls) & F & ((item i of ids) = activeId) & R
  end repeat
end repeat`;

const select = (tabId: string) => `repeat with win in windows
  set ids to id of tabs of win
  repeat with i from 1 to count ids
    if (item i of ids as text) is ${quote(tabId)} then
      set active tab index of win to i
      set index of win to 1
      return "ok"
    end if
  end repeat
end repeat`;

/** Rows: tabId, title, url, active. */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 4).map(([tabId, title, url, active]) => ({
    key: `${app.bundleId}:${tabId}`,
    app,
    source: chromium.id,
    kind: "tab",
    title: title || url,
    detail: url,
    url,
    active: isTrue(active),
    ref: { tabId },
  }));
}

export const chromium: TabSource<Ref> = {
  id: "chromium",
  bundleIds: [
    "com.google.Chrome",
    "com.google.Chrome.beta",
    "com.google.Chrome.dev",
    "com.google.Chrome.canary",
    "com.brave.Browser",
    "com.microsoft.edgemac",
    "org.chromium.Chromium",
    "com.vivaldi.Vivaldi",
  ],
  list: async (app, platform) => parse(app, await platform.runAppleScript(listScript(app.bundleId, LIST))),
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref.tabId)),
};
