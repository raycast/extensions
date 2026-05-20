import { Toast, getPreferenceValues, showToast } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const TABBIT_BUNDLE_ID = "com.tab-browser.Tabbit";

export type TabbitVersionPreference = "auto" | "cn" | "global";

type TabbitApp = {
  version: Exclude<TabbitVersionPreference, "auto">;
  bundleId: string;
  appPath: string;
  executablePath: string;
  profileDirectory: string;
};

const TABBIT_APPS = {
  cn: {
    version: "cn",
    bundleId: "com.tab-browser.Tabbit",
    appPath: "/Applications/Tabbit Browser.app",
    executablePath:
      "/Applications/Tabbit Browser.app/Contents/MacOS/Tabbit Browser",
    profileDirectory: join(
      homedir(),
      "Library/Application Support/Tabbit Browser/Default",
    ),
  },
  global: {
    version: "global",
    bundleId: "com.tabbit-ai.Tabbit",
    appPath: "/Applications/Tabbit.app",
    executablePath: "/Applications/Tabbit.app/Contents/MacOS/Tabbit",
    profileDirectory: join(
      homedir(),
      "Library/Application Support/Tabbit/Default",
    ),
  },
} as const satisfies Record<
  Exclude<TabbitVersionPreference, "auto">,
  TabbitApp
>;

export type TabbitItemType = "tab" | "history" | "bookmark";
export type SearchEngine =
  | "bing"
  | "google"
  | "duckduckgo"
  | "brave"
  | "yahoo"
  | "baidu"
  | "sogou"
  | "so"
  | "yandex"
  | "ecosia"
  | "kagi";

export type TabbitItem = {
  id: string;
  title: string;
  url: string;
  subtitle?: string;
  type: TabbitItemType;
  windowIndex?: number;
  tabIndex?: number;
};

type TabbitPreferences = {
  tabbitVersion?: TabbitVersionPreference;
};

export function resolveTabbitApp(
  preferredVersion: TabbitVersionPreference = "auto",
  appExists: (path: string) => boolean = existsSync,
): TabbitApp {
  const cnInstalled = appExists(TABBIT_APPS.cn.appPath);
  const globalInstalled = appExists(TABBIT_APPS.global.appPath);

  if (cnInstalled && !globalInstalled) {
    return TABBIT_APPS.cn;
  }

  if (globalInstalled && !cnInstalled) {
    return TABBIT_APPS.global;
  }

  if (preferredVersion === "global") {
    return TABBIT_APPS.global;
  }

  return TABBIT_APPS.cn;
}

export function getSelectedTabbitApp() {
  const preferences = getPreferenceValues<TabbitPreferences>();

  return resolveTabbitApp(preferences.tabbitVersion || "auto");
}

export async function openTabbit(args: string[] = []) {
  try {
    launchTabbit(args);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Tabbit Browser",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function openUrlInTabbit(url: string) {
  try {
    launchTabbit([normalizeUrlOrSearch(url)]);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open URL in Tabbit Browser",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function switchToTab(windowIndex: number, tabIndex: number) {
  const app = getSelectedTabbitApp();
  const script = `
tell application id "${app.bundleId}"
  set active tab index of window ${windowIndex} to ${tabIndex}
  set index of window ${windowIndex} to 1
  activate
end tell
`;

  await execFileAsync("osascript", ["-e", script], { timeout: 5000 });
}

export async function getOpenTabs(): Promise<TabbitItem[]> {
  const app = getSelectedTabbitApp();
  const script = `
tell application id "${app.bundleId}"
  set tabLines to {}
  repeat with windowIndex from 1 to count windows
    repeat with tabIndex from 1 to count tabs of window windowIndex
      set currentTab to tab tabIndex of window windowIndex
      set end of tabLines to (windowIndex as text) & "\\t" & (tabIndex as text) & "\\t" & ((title of currentTab) as text) & "\\t" & ((URL of currentTab) as text)
    end repeat
  end repeat
  set AppleScript's text item delimiters to linefeed
  return tabLines as text
end tell
`;

  const { stdout } = await execFileAsync("osascript", ["-e", script], {
    timeout: 5000,
  });

  return stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [windowIndex, tabIndex, title, url] = line.split("\t");

      return {
        id: `tab-${windowIndex}-${tabIndex}-${index}`,
        title: title || url,
        url,
        subtitle: url,
        type: "tab" as const,
        windowIndex: Number(windowIndex),
        tabIndex: Number(tabIndex),
      };
    })
    .filter((item) => isSearchableTabbitUrl(item.url));
}

export async function getHistory(): Promise<TabbitItem[]> {
  const historyPath = join(getSelectedTabbitApp().profileDirectory, "History");
  const databaseUrl = `file:${historyPath}?mode=ro&immutable=1`;
  const query = `
select
  url,
  coalesce(nullif(title, ''), url) as title,
  last_visit_time
from urls
where hidden = 0
  and url not like 'chrome://%'
  and url not like 'devtools://%'
  and url not like 'tabbit://%'
order by last_visit_time desc
limit 500;
`;

  const { stdout } = await execFileAsync(
    "sqlite3",
    ["-json", databaseUrl, query],
    { timeout: 5000 },
  );
  const rows = JSON.parse(stdout || "[]") as {
    url: string;
    title: string;
    last_visit_time: number;
  }[];
  const seenUrls = new Set<string>();

  return rows
    .filter((row) => {
      if (!isSearchableTabbitUrl(row.url) || seenUrls.has(row.url)) {
        return false;
      }

      seenUrls.add(row.url);
      return true;
    })
    .map((row) => ({
      id: `history-${row.last_visit_time}-${row.url}`,
      title: row.title || row.url,
      url: row.url,
      subtitle: row.url,
      type: "history",
    }));
}

export async function getBookmarks(): Promise<TabbitItem[]> {
  const bookmarksPath = join(
    getSelectedTabbitApp().profileDirectory,
    "Bookmarks",
  );
  const bookmarks = JSON.parse(
    await readFile(bookmarksPath, "utf8"),
  ) as BookmarkFile;
  const items: TabbitItem[] = [];

  for (const root of Object.values(bookmarks.roots)) {
    collectBookmarks(root, [], items);
  }

  return items;
}

export function isSearchableTabbitUrl(url: string) {
  return Boolean(url) && !url.trim().toLowerCase().startsWith("tabbit://");
}

export async function getAllItems(): Promise<TabbitItem[]> {
  const [tabs, bookmarks, history] = await Promise.allSettled([
    getOpenTabs(),
    getBookmarks(),
    getHistory(),
  ]);

  return [
    ...(tabs.status === "fulfilled" ? tabs.value : []),
    ...(bookmarks.status === "fulfilled" ? bookmarks.value : []),
    ...(history.status === "fulfilled" ? history.value : []),
  ];
}

export function normalizeUrl(value: string) {
  const trimmedValue = value.trim();

  if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)) {
    return trimmedValue;
  }

  return `https://${trimmedValue}`;
}

export function isLikelyUrl(value: string) {
  const trimmedValue = value.trim();

  if (/^\S+:\/\//.test(trimmedValue)) {
    return true;
  }

  if (/^localhost(:\d+)?(\/.*)?$/i.test(trimmedValue)) {
    return true;
  }

  return /^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(trimmedValue);
}

export function normalizeUrlOrSearch(
  value: string,
  searchEngine: SearchEngine = "bing",
) {
  const trimmedValue = value.trim();

  if (isLikelyUrl(trimmedValue)) {
    return normalizeUrl(trimmedValue);
  }

  return buildSearchUrl(trimmedValue, searchEngine);
}

function buildSearchUrl(query: string, searchEngine: SearchEngine) {
  const encodedQuery = encodeURIComponent(query);

  switch (searchEngine) {
    case "google":
      return `https://www.google.com/search?q=${encodedQuery}`;
    case "duckduckgo":
      return `https://duckduckgo.com/?q=${encodedQuery}`;
    case "brave":
      return `https://search.brave.com/search?q=${encodedQuery}`;
    case "yahoo":
      return `https://search.yahoo.com/search?p=${encodedQuery}`;
    case "baidu":
      return `https://www.baidu.com/s?wd=${encodedQuery}`;
    case "sogou":
      return `https://www.sogou.com/web?query=${encodedQuery}`;
    case "so":
      return `https://www.so.com/s?q=${encodedQuery}`;
    case "yandex":
      return `https://yandex.com/search/?text=${encodedQuery}`;
    case "ecosia":
      return `https://www.ecosia.org/search?q=${encodedQuery}`;
    case "kagi":
      return `https://kagi.com/search?q=${encodedQuery}`;
    case "bing":
    default:
      return `https://www.bing.com/search?q=${encodedQuery}`;
  }
}

function launchTabbit(args: string[]) {
  const app = getSelectedTabbitApp();

  if (existsSync(app.executablePath)) {
    const child = spawn(app.executablePath, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
    return;
  }

  const openArgs = ["-b", app.bundleId];

  if (args.length > 0) {
    openArgs.push("--args", ...args);
  }

  const child = spawn("open", openArgs, {
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

type BookmarkFile = {
  roots: Record<string, BookmarkNode>;
};

type BookmarkNode = {
  children?: BookmarkNode[];
  name?: string;
  type: "folder" | "url";
  url?: string;
};

function collectBookmarks(
  node: BookmarkNode,
  folders: string[],
  items: TabbitItem[],
) {
  const url = node.url;

  if (node.type === "url" && url && isSearchableTabbitUrl(url)) {
    items.push({
      id: `bookmark-${items.length}-${url}`,
      title: node.name || url,
      url,
      subtitle: folders.length > 0 ? `${folders.join(" / ")} - ${url}` : url,
      type: "bookmark",
    });
    return;
  }

  for (const child of node.children || []) {
    collectBookmarks(
      child,
      node.name ? [...folders, node.name] : folders,
      items,
    );
  }
}
