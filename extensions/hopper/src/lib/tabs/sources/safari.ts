// Safari tabs have no id: remember window id + position, and the URL to catch a tab that moved.
// Private windows are skipped entirely (ADR-018). AppleScript can't tell them apart; only their Accessibility
// title can: the page title wrapped in localized text ("<page>, Private Browsing", "<page>、プライベートブラウズ"),
// while an ordinary window's is the page title alone. So the two window lists are matched in front-to-back order.

import { isTrue, listScript, parseRecords, quote, runSelect } from "../applescript";
import { webReopenTarget } from "../reopen";
import type { App, AXWindow, Platform, Tab, TabSource } from "../model";

interface Ref {
  windowId: string;
  index: number;
  url: string;
}

const LIST = `repeat with win in windows
  try
    set wid to id of win
    set wname to name of win
    set cur to index of current tab of win
    set names to name of tabs of win
    set urls to URL of tabs of win
    repeat with i from 1 to count names
      set out to out & wid & F & i & F & (item i of names) & F & (item i of urls) & F & (i = cur) & F & wname & R
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

/** Rows: windowId, index, title, url, active, window name. */
export function parse(app: App, out: string): Tab<Ref>[] {
  return parseRecords(out, 6).map(([windowId, index, title, url, active]) => ({
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

/** AppleScript windows (id, name) in front-to-back order, from the list output. */
export function scriptWindows(out: string): { id: string; name: string }[] {
  const seen = new Map<string, string>();
  for (const [windowId, , , , , name] of parseRecords(out, 6)) if (!seen.has(windowId)) seen.set(windowId, name);
  return [...seen].map(([id, name]) => ({ id, name }));
}

/**
 * Ids of the AppleScript windows to leave out: private ones. Each AppleScript window takes the next Accessibility
 * window titled with its name: exactly (ordinary) or wrapped in more text (private, in any language; Safari exposes
 * no other marker, AXIdentifier's IsSecure is false too). Fails closed: when Accessibility sees no windows (not
 * granted), every window is left out; a window that can't be matched (on another Space, or retitled between the two
 * reads) is left out while an Accessibility window is unaccounted for, since that one may be private.
 */
export function privateWindowIds(script: { id: string; name: string }[], ax: AXWindow[]): Set<string> {
  if (script.length > 0 && ax.length === 0) return new Set(script.map((w) => w.id));
  const pool = ax.map((w) => ({ title: w.title, used: false }));
  const hidden = new Set<string>();
  const unmatched: string[] = [];
  for (const w of script) {
    const match = pool.find(
      (p) => !p.used && (p.title === w.name || (p.title.length > w.name.length && p.title.includes(w.name))),
    );
    if (!match) unmatched.push(w.id);
    else {
      match.used = true;
      if (match.title !== w.name) hidden.add(w.id);
    }
  }
  if (pool.some((p) => !p.used)) for (const id of unmatched) hidden.add(id);
  return hidden;
}

async function list(app: App, platform: Platform): Promise<Tab<Ref>[]> {
  const [out, ax] = await Promise.all([
    platform.runAppleScript(listScript(app.bundleId, LIST)),
    platform.windows([app.bundleId]).then(
      (apps) => apps.find((a) => a.bundleId === app.bundleId)?.windows ?? [],
      () => [],
    ),
  ]);
  const hidden = privateWindowIds(scriptWindows(out), ax);
  return parse(app, out).filter((t) => !hidden.has(t.ref.windowId));
}

export const safari: TabSource<Ref> = {
  id: "safari",
  bundleIds: ["com.apple.Safari"],
  list,
  select: (tab, platform) => runSelect(platform, tab.app.bundleId, select(tab.ref)),
  reopenTarget: (tab) => webReopenTarget(tab.url),
};
