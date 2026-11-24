import { closeMainWindow, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);
const APP = "yab";
const SUPPORT = join(homedir(), "Library/Application Support/Yab");
// Yab stores times as seconds since 2001-01-01 (Apple's reference date).
const APPLE_EPOCH = 978307200;

export type Tab = {
  id: string;
  title: string;
  url: string;
  location: string; // "topApp" (pin), "pinned" (kept), "unpinned" (today)
  spaceId: string;
  spaceTitle: string;
  window: number;
  active: boolean;
};

export type Space = { id: string; title: string; icon: string; color: string; window: number; active: boolean };

export type HistoryItem = { url: string; title: string; count: number; lastVisit: Date };

async function jxa<T>(source: string, ...args: string[]): Promise<T> {
  const { stdout } = await run("osascript", ["-l", "JavaScript", "-e", source, ...args], {
    maxBuffer: 32 * 1024 * 1024,
  });
  return JSON.parse(stdout) as T;
}

async function applescript(source: string, ...args: string[]): Promise<string> {
  const { stdout } = await run("osascript", ["-e", source, ...args]);
  return stdout.trim();
}

// Each property is fetched for all tabs in one call. Asking tab by tab takes ~25 s for 200 tabs.
export async function getTabs(): Promise<Tab[]> {
  return jxa<Tab[]>(`function run() {
    const y = Application("${APP}"); const out = [];
    for (let wi = 0; wi < y.windows.length; wi++) {
      const w = y.windows[wi];
      if (w.incognito()) continue;
      const ids = w.tabs.id(), titles = w.tabs.title(), urls = w.tabs.url(), locs = w.tabs.location();
      let sids = [], stitles = [];
      try { sids = w.tabs.space.id(); stitles = w.tabs.space.title(); } catch (e) {}
      const a = w.activeTab(); const activeId = a ? a.id() : "";
      ids.forEach((id, i) => out.push({ id, title: titles[i] || "", url: urls[i] || "", location: locs[i] || "",
        spaceId: sids[i] || "", spaceTitle: stitles[i] || "", window: wi, active: wi === 0 && id === activeId }));
    }
    return JSON.stringify(out);
  }`);
}

export async function getSpaces(): Promise<Space[]> {
  return jxa<Space[]>(`function run() {
    const y = Application("${APP}"); const out = []; const seen = {};
    for (let wi = 0; wi < y.windows.length; wi++) {
      const w = y.windows[wi];
      if (w.incognito()) continue;
      const a = w.activeSpace(); const activeId = a ? a.id() : "";
      const ids = w.spaces.id(), titles = w.spaces.title(), icons = w.spaces.icon(), colors = w.spaces.color();
      ids.forEach((id, i) => {
        if (seen[id]) return; seen[id] = true;
        out.push({ id, title: titles[i], icon: icons[i], color: colors[i], window: wi, active: wi === 0 && id === activeId });
      });
    }
    return JSON.stringify(out);
  }`);
}

// Finds a tab or space by id and runs an action on it. Returns false when it is gone.
async function withItem(kind: "tabs" | "spaces", id: string, action: string): Promise<boolean> {
  return jxa<boolean>(
    `function run(argv) {
    const y = Application("${APP}");
    for (let wi = 0; wi < y.windows.length; wi++) {
      const w = y.windows[wi];
      const i = w.${kind}.id().indexOf(argv[0]);
      if (i < 0) continue;
      const item = w.${kind}[i];
      ${action}
      return "true";
    }
    return "false";
  }`,
    id,
  );
}

export async function selectTab(id: string) {
  await closeMainWindow();
  if (!(await withItem("tabs", id, "y.select(item); y.activate();"))) throw new Error("The tab is closed");
}

export async function closeTab(id: string) {
  if (!(await withItem("tabs", id, "item.close();"))) throw new Error("The tab is already closed");
}

export async function focusSpace(id: string) {
  await closeMainWindow();
  if (!(await withItem("spaces", id, "y.focus(item); y.activate();"))) throw new Error("The space is gone");
}

export async function openTab(url?: string) {
  await closeMainWindow();
  await applescript(
    `on run argv
    tell application "${APP}"
      if (count of windows) is 0 then make new window
      if (count of argv) > 0 then
        make new tab with properties {URL:(item 1 of argv)}
      else
        make new tab
      end if
      activate
    end tell
  end run`,
    ...(url ? [url] : []),
  );
}

export async function openWindow(incognito = false) {
  await closeMainWindow();
  await applescript(`tell application "${APP}"
    make new window${incognito ? " with properties {incognito:true}" : ""}
    activate
  end tell`);
}

export async function openSmallWindow(url?: string) {
  await closeMainWindow();
  await applescript(
    `on run argv
    tell application "${APP}"
      if (count of argv) > 0 then
        open small window (item 1 of argv)
      else
        open small window
      end if
      activate
    end tell
  end run`,
    ...(url ? [url] : []),
  );
}

type RawHistory = { url: string; title?: string; count?: number; last?: number; key?: string };

export function getHistory(): HistoryItem[] {
  const files = readdirSync(SUPPORT).filter((f) => /^history(-.+)?\.json$/.test(f));
  const byKey = new Map<string, HistoryItem>();
  for (const file of files) {
    let rows: RawHistory[] = [];
    try {
      rows = JSON.parse(readFileSync(join(SUPPORT, file), "utf8"));
    } catch {
      continue;
    }
    for (const r of rows) {
      if (!r.url) continue;
      const key = r.key ?? r.url;
      const last = new Date(((r.last ?? 0) + APPLE_EPOCH) * 1000);
      const prev = byKey.get(key);
      if (!prev) {
        byKey.set(key, { url: r.url, title: r.title ?? "", count: r.count ?? 1, lastVisit: last });
      } else {
        // The same page shows up in each space's file. Keep the newest visit.
        if (last > prev.lastVisit) {
          prev.lastVisit = last;
          prev.url = r.url;
        }
        if (!prev.title && r.title) prev.title = r.title;
        prev.count = Math.max(prev.count, r.count ?? 1);
      }
    }
  }
  return [...byKey.values()].sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());
}

export function faviconFor(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const local = join(SUPPORT, "icons", `${host}.png`);
    if (existsSync(local)) return { source: local };
  } catch {
    // not a URL
  }
  return getFavicon(url);
}

const ENGINES: Record<string, string> = {
  google: "https://www.google.com/search?q=",
  duckduckgo: "https://duckduckgo.com/?q=",
  bing: "https://www.bing.com/search?q=",
  kagi: "https://kagi.com/search?q=",
};

export function searchUrl(query: string) {
  const { searchEngine } = getPreferenceValues<{ searchEngine?: string }>();
  return (ENGINES[searchEngine ?? "google"] ?? ENGINES.google) + encodeURIComponent(query);
}

// Returns a full URL when the text looks like one, otherwise undefined.
export function toUrl(text: string): string | undefined {
  const t = text.trim();
  if (!t || /\s/.test(t)) return undefined;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(t) || /^(about|file|chrome|mailto):/i.test(t)) return t;
  if (/^localhost(:\d+)?(\/|$)/i.test(t) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/|$)/.test(t)) return `http://${t}`;
  if (/^[^/\s]+\.[a-z]{2,}(:\d+)?(\/.*)?$/i.test(t)) return `https://${t}`;
  return undefined;
}

export async function failed(title: string, error: unknown) {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}
