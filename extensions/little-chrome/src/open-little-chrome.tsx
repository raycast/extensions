import {
  Action,
  ActionPanel,
  Cache,
  closeMainWindow,
  environment,
  getPreferenceValues,
  Icon,
  launchCommand,
  LaunchProps,
  LaunchType,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Blocklist, CHROME_DIR, isBlocked, loadBlocklist, saveBlocklist } from "./blocklist";
import { loadBookmarks } from "./bookmarks";
import { addLittleWindowId, CHROME, exec, osascript, windowIds } from "./chrome";
import { ManageHiddenSuggestions, ProfileNotFound } from "./manage-hidden";
import { chromeProfiles, defaultProfile, profileName } from "./profile";
import { buildSuggestions, HISTORY_LIMIT, MODES, SuggestionMode, USED_BOOKMARKS_LIMIT } from "./suggestions";

export function toUrl(input: string): string {
  const q = input.trim();
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(q) || /^(about|chrome|data|file|mailto):/i.test(q)) return q;
  if (/\s/.test(q)) return googleSearch(q);
  if (/^(localhost|127\.0\.0\.1|\[::1\]|[\w-]+\.(localhost|test))(:\d+)?([/?#].*)?$/i.test(q)) return `http://${q}`;
  if (/^([\w-]+\.)+[a-z]{2,}(:\d+)?([/?#].*)?$/i.test(q) || /^\d{1,3}(\.\d{1,3}){3}(:\d+)?([/?#].*)?$/.test(q)) {
    return `https://${q}`;
  }
  return googleSearch(q);
}

function googleSearch(q: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}

async function isChromeRunning(): Promise<boolean> {
  return (await osascript(`application "${CHROME}" is running`)) === "true";
}

const bareHost = (url: string) => hostOf(url)?.replace(/^www\./, "");

// Finds the app window this launch created: a window that did not exist before, with a single tab
// on the requested host. Anything else (e.g. a redirect to another host) is left alone rather than
// risk recording a window the user opened.
async function findLaunchedWindow(before: Set<string>, url: string): Promise<string | undefined> {
  const host = bareHost(url);
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 75));
    const candidates: { id: string; host?: string }[] = [];
    for (const id of (await windowIds()).filter((w) => !before.has(w))) {
      const [tabs, tabUrl] = (
        await osascript(`tell application "${CHROME}" to get {count tabs, URL of active tab} of window id ${id}`)
      ).split(/,\s*/);
      if (tabs === "1") candidates.push({ id, host: bareHost(tabUrl ?? "") });
    }
    const match = candidates.find((c) => host && c.host === host);
    if (match) return match.id;
  }
  return undefined;
}

async function resizeNewWindow(before: Set<string>, url: string, width: number, height: number): Promise<void> {
  const id = await findLaunchedWindow(before, url);
  if (!id) return;
  await addLittleWindowId(id);
  await osascript(`tell application "${CHROME}"
      set w to window id ${id}
      set b to bounds of w
      set bounds of w to {item 1 of b, item 2 of b, (item 1 of b) + ${width}, (item 2 of b) + ${height}}
      set index of w to 1
      activate
    end tell`);
}

export async function openLittleChrome(url: string, profile: string): Promise<void> {
  const prefs = getPreferenceValues<Preferences>();
  const width = parseInt(prefs.width ?? "", 10) || 900;
  const height = parseInt(prefs.height ?? "", 10) || 700;

  await closeMainWindow({ clearRootSearch: true });
  // Reading and resizing windows needs Automation permission; open the window even without it.
  let before: Set<string> | undefined;
  try {
    before = new Set((await isChromeRunning()) ? await windowIds() : []);
  } catch {
    before = undefined;
  }
  try {
    await exec("open", [
      "-na",
      CHROME,
      "--args",
      `--profile-directory=${profile}`,
      `--app=${url}`,
      `--window-size=${width},${height}`,
    ]);
  } catch (e) {
    await showHUD(`Little Chrome failed: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  if (before) await resizeNewWindow(before, url, width, height).catch(() => undefined);
}

// Raycast stops a view command once its window closes, before the new window is resized and
// recorded, so hand the URL to the no-view Open URL command.
async function launchLittleChrome(url: string, profile: string): Promise<void> {
  try {
    await launchCommand({ name: "open-url", type: LaunchType.Background, arguments: { url, profile } });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Little Chrome failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return;
  }
  await closeMainWindow({ clearRootSearch: true });
}

// Chrome opens URLs from other apps in the profile's last active normal window, never in an app window.
async function openInChromeTab(url: string, profile: string): Promise<void> {
  try {
    await exec("open", ["-na", CHROME, "--args", `--profile-directory=${profile}`, url]);
  } catch (e) {
    await showHUD(`Opening in Chrome failed: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  await closeMainWindow({ clearRootSearch: true });
}

type HistoryItem = { url: string; title: string; favicon?: string };

const FAVICON_DIR = join(environment.supportPath, "favicons");

function hostOf(url: string): string | undefined {
  try {
    return new URL(url).host || undefined;
  } catch {
    return undefined;
  }
}

// Chrome locks its History/Favicons DBs while running, so query snapshot copies.
function snapshotHistory(profile: string): string | undefined {
  try {
    const dest = join(tmpdir(), "little-chrome-history.sqlite");
    copyFileSync(join(CHROME_DIR, profile, "History"), dest);
    trendTables.delete(dest);
    try {
      copyFileSync(join(CHROME_DIR, profile, "Favicons"), join(tmpdir(), "little-chrome-favicons.sqlite"));
    } catch {
      // history without favicons
    }
    return dest;
  } catch {
    return undefined;
  }
}

async function sqlite<T>(db: string, sql: string, signal?: AbortSignal): Promise<T[]> {
  const favicons = join(tmpdir(), "little-chrome-favicons.sqlite");
  const attach = existsSync(favicons) ? ["-cmd", `ATTACH '${favicons.replace(/'/g, "''")}' AS f`] : [];
  const { stdout } = await exec("sqlite3", [...attach, "-json", db, sql], { maxBuffer: 10 * 1024 * 1024, signal });
  return stdout.trim() ? JSON.parse(stdout) : [];
}

const CHROME_NOW = `((strftime('%s', 'now') + 11644473600) * 1000000)`;
const DAY = 86400000000;

// Trending: visits over the last 2 days and the 28 days before, counted once per snapshot and
// reused by every search. Resolves false when the table can't be made; searches then skip the boost.
const trendTables = new Map<string, Promise<boolean>>();
function ensureTrendTable(db: string): Promise<boolean> {
  let ready = trendTables.get(db);
  if (!ready) {
    ready = sqlite(
      db,
      `DROP TABLE IF EXISTS little_chrome_trend;
       CREATE TABLE little_chrome_trend AS SELECT url AS id, SUM(visit_time > ${CHROME_NOW} - 2 * ${DAY}) AS recent,
         SUM(visit_time <= ${CHROME_NOW} - 2 * ${DAY}) AS prior
       FROM visits WHERE visit_time > ${CHROME_NOW} - 30 * ${DAY} GROUP BY url;`,
    ).then(
      () => true,
      () => false,
    );
    trendTables.set(db, ready);
  }
  return ready;
}

// Largest favicon bitmap of a page, as bitmap id + update time; files are cached under that name.
const largestBitmap = (pageUrl: string) => `(SELECT b.id || '-' || b.last_updated FROM f.icon_mapping m
  JOIN f.favicon_bitmaps b ON b.icon_id = m.icon_id WHERE m.page_url = ${pageUrl} ORDER BY b.width DESC LIMIT 1)`;

async function faviconFiles(
  db: string,
  profile: string,
  bitmaps: (string | null)[],
): Promise<(bitmap: string | null) => string | undefined> {
  const dir = join(FAVICON_DIR, profile);
  const file = (b: string) => join(dir, `${b}.png`);
  const missing = [...new Set(bitmaps.filter((b): b is string => !!b))].filter((b) => !existsSync(file(b)));
  if (missing.length) {
    mkdirSync(dir, { recursive: true });
    const ids = missing.map((b) => parseInt(b, 10)).join(",");
    const images = await sqlite<{ key: string; data: string }>(
      db,
      `SELECT id || '-' || last_updated AS key, hex(image_data) AS data FROM f.favicon_bitmaps WHERE id IN (${ids})`,
    );
    for (const { key, data } of images) writeFileSync(file(key), Buffer.from(data, "hex"));
  }
  return (b) => (b && existsSync(file(b)) ? file(b) : undefined);
}

// Favicons of the given pages, in one query; pages without one are left out.
async function lookupFavicons(
  db: string,
  profile: string,
  urls: string[],
  signal?: AbortSignal,
): Promise<Map<string, string>> {
  try {
    const list = join(tmpdir(), "little-chrome-favicon-urls.json");
    writeFileSync(list, JSON.stringify(urls));
    const rows = await sqlite<{ url: string; bitmap: string | null }>(
      db,
      `SELECT value AS url, ${largestBitmap("value")} AS bitmap
       FROM json_each(readfile('${list.replace(/'/g, "''")}'))`,
      signal,
    );
    const fileOf = await faviconFiles(
      db,
      profile,
      rows.map((r) => r.bitmap),
    );
    return new Map(
      rows.flatMap(({ url, bitmap }) => {
        const favicon = fileOf(bitmap);
        return favicon ? [[url, favicon] as const] : [];
      }),
    );
  } catch (e) {
    if (signal?.aborted) throw e;
    return new Map();
  }
}

async function searchHistory(
  db: string,
  profile: string,
  text: string,
  blocklist: Blocklist,
  limit: number,
  signal?: AbortSignal,
  only?: string[],
): Promise<HistoryItem[]> {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const escape = (w: string) => w.replace(/'/g, "''").replace(/[\\%_]/g, "\\$&");
  const where = words.map((w) => {
    const like = `'%${escape(w)}%'`;
    return `(url LIKE ${like} ESCAPE '\\' OR title LIKE ${like} ESCAPE '\\')`;
  });
  if (blocklist.urls.length)
    where.push(`url NOT IN (${blocklist.urls.map((u) => `'${u.replace(/'/g, "''")}'`).join(",")})`);
  for (const host of blocklist.hosts) {
    const h = escape(host);
    where.push(`NOT (url LIKE 'https://${h}/%' ESCAPE '\\' OR url LIKE 'http://${h}/%' ESCAPE '\\')`);
  }
  if (only) {
    const file = join(tmpdir(), "little-chrome-urls.json");
    writeFileSync(file, JSON.stringify(only));
    where.push(`url IN (SELECT value FROM json_each(readfile('${file.replace(/'/g, "''")}')))`);
  }
  const filter = `hidden = 0 ${where.map((w) => `AND ${w}`).join(" ")}`;
  // Frecency: visits (typed ones weigh double) decayed by days since the last visit,
  // tripled when the first word matches the start of the host (e.g. "git" -> github.com).
  const hostMatch = words.length
    ? `CASE WHEN ${["https://", "http://", "https://www.", "http://www."]
        .map((p) => `url LIKE '${p}${escape(words[0])}%' ESCAPE '\\'`)
        .join(" OR ")} THEN 3 ELSE 1 END`
    : "1";
  const days = `(${CHROME_NOW} - last_visit_time) / ${DAY}.0`;
  const recency = `CASE WHEN ${days} < 4 THEN 1.0 WHEN ${days} < 14 THEN 0.7 WHEN ${days} < 31 THEN 0.5
    WHEN ${days} < 90 THEN 0.3 ELSE 0.1 END`;
  // Trending: visits per day over the last 2 days against the 28 days before, so pages that suddenly
  // get visited a lot rise. The +1 keeps a single new visit from spiking; capped at 5x.
  const hasTrend = await ensureTrendTable(db);
  const growth = hasTrend ? `MIN(5.0, COALESCE(trend.recent, 0) / 2.0 / (COALESCE(trend.prior, 0) / 28.0 + 1))` : "0";
  const from = hasTrend ? `FROM urls LEFT JOIN little_chrome_trend AS trend ON trend.id = urls.id` : "FROM urls";
  const order = `ORDER BY (visit_count + 2 * typed_count) * ${recency} * ${hostMatch} * (1 + ${growth}) DESC,
    last_visit_time DESC LIMIT ${limit}`;
  try {
    const rows = await sqlite<HistoryItem & { bitmap: string | null }>(
      db,
      `SELECT url, title, ${largestBitmap("urls.url")} AS bitmap ${from} WHERE ${filter} ${order}`,
      signal,
    );
    const fileOf = await faviconFiles(
      db,
      profile,
      rows.map((r) => r.bitmap),
    );
    return rows.map(({ url, title, bitmap }) => ({ url, title, favicon: fileOf(bitmap) }));
  } catch (e) {
    if (signal?.aborted) throw e;
    return sqlite<HistoryItem>(db, `SELECT url, title ${from} WHERE ${filter} ${order}`, signal);
  }
}

// Last suggestions for an empty search, shown instantly on open while fresh ones load.
const cache = new Cache();

export default function Command(props: LaunchProps) {
  const initialProfile = useMemo(defaultProfile, []);
  return initialProfile ? <LittleChrome {...props} initialProfile={initialProfile} /> : <ProfileNotFound />;
}

function LittleChrome(props: LaunchProps & { initialProfile: string }) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const profiles = useMemo(chromeProfiles, []);
  const [profile, setProfile] = useState(props.initialProfile);
  const [mode, setMode] = useState<SuggestionMode>(MODES[0]);
  const profileRef = useRef(profile);
  const profileLabel = useMemo(() => profileName(profile), [profile]);
  const cacheKey = `initial:${profile}`;
  const bookmarksCacheKey = `initial-bookmarks:${profile}`;
  const [items, setItems] = useState<HistoryItem[]>(() => {
    const cached = !props.fallbackText && cache.get(cacheKey);
    return cached ? JSON.parse(cached) : [];
  });
  // Bookmarks most used recently, by the same ranking as history; shown when the search is empty.
  const [recentBookmarks, setRecentBookmarks] = useState<HistoryItem[]>(() => {
    const cached = !props.fallbackText && cache.get(bookmarksCacheKey);
    return cached ? JSON.parse(cached) : [];
  });
  // The search the shown results belong to; bookmarks follow it so they change together with history.
  const [resultsText, setResultsText] = useState(searchText);
  const firstQuery = useRef(true);
  // Raycast resets the selection to the first row on every search change, so give each
  // result set fresh ids to make selectedItemId change and re-select the top history row.
  const [generation, setGeneration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [blocklist, setBlocklist] = useState<Blocklist>();
  const db = useMemo(() => snapshotHistory(profile), [profile]);
  const bookmarks = useMemo(() => loadBookmarks(profile), [profile]);

  useEffect(() => {
    let cancelled = false;
    loadBlocklist(profile).then((b) => !cancelled && setBlocklist(b));
    return () => {
      cancelled = true;
    };
  }, [profile]);

  function changeProfile(next: string) {
    if (next === profile) return;
    profileRef.current = next;
    setProfile(next);
    setBlocklist(undefined);
    const cached = !searchText.trim() && cache.get(`initial:${next}`);
    setItems(cached ? JSON.parse(cached) : []);
    const cachedBookmarks = !searchText.trim() && cache.get(`initial-bookmarks:${next}`);
    setRecentBookmarks(cachedBookmarks ? JSON.parse(cachedBookmarks) : []);
    firstQuery.current = true;
  }

  async function updateBlocklist(next: Blocklist) {
    await saveBlocklist(profile, next);
    if (profileRef.current === profile) setBlocklist(next);
    // The cached empty-search rows are only rewritten by an empty search, so drop hidden ones now.
    const cached = cache.get(cacheKey);
    if (cached) {
      const rows: HistoryItem[] = JSON.parse(cached);
      cache.set(cacheKey, JSON.stringify(rows.filter((r) => !isBlocked(r.url, next))));
    }
  }

  async function hide(next: Blocklist, title: string) {
    const previous = blocklist!;
    await updateBlocklist(next);
    await showToast({
      style: Toast.Style.Success,
      title,
      primaryAction: { title: "Undo", onAction: () => updateBlocklist(previous) },
    });
  }

  useEffect(() => {
    if (!blocklist) return;
    if (!db) {
      setResultsText(searchText);
      return setIsLoading(false);
    }
    let cancelled = false;
    const abort = new AbortController();
    setIsLoading(true);
    // Debounce the query only (not the first one); the typed row follows searchText immediately and
    // stays selected until fresh results arrive, so Enter while typing opens what was typed.
    const delay = firstQuery.current ? 0 : 150;
    firstQuery.current = false;
    const empty = !searchText.trim();
    const timer = setTimeout(() => {
      Promise.all([
        searchHistory(db, profile, searchText, blocklist, HISTORY_LIMIT, abort.signal),
        empty && bookmarks.length
          ? searchHistory(
              db,
              profile,
              "",
              blocklist,
              USED_BOOKMARKS_LIMIT,
              abort.signal,
              bookmarks.map((b) => b.url),
            ).catch(() => [])
          : [],
      ])
        .then(([r, recent]) => {
          if (cancelled) return;
          setItems(r);
          if (empty) setRecentBookmarks(recent);
          setResultsText(searchText);
          setGeneration((g) => g + 1);
          if (empty) {
            cache.set(cacheKey, JSON.stringify(r));
            cache.set(bookmarksCacheKey, JSON.stringify(recent));
          }
        })
        .catch(() => {
          if (cancelled) return;
          setItems([]);
          setResultsText(searchText);
        })
        .finally(() => !cancelled && setIsLoading(false));
    }, delay);
    return () => {
      cancelled = true;
      abort.abort();
      clearTimeout(timer);
    };
  }, [db, profile, searchText, blocklist, cacheKey, bookmarksCacheKey, bookmarks]);

  const typed = searchText.trim();
  const { bookmarks: shownBookmarks, history: visible } = useMemo(
    () => buildSuggestions(mode, resultsText, bookmarks, recentBookmarks, items, blocklist),
    [mode, resultsText, bookmarks, recentBookmarks, items, blocklist],
  );
  const favicons = new Map([...items, ...recentBookmarks].map((item) => [item.url, item.favicon]));
  const bookmarkFavicons = useFavicons(
    profile,
    db,
    shownBookmarks.map((b) => b.url),
  );
  const top = shownBookmarks[0]
    ? `${generation}:bookmark:${shownBookmarks[0].url}`
    : visible[0] && `${generation}:${visible[0].url}`;

  // Also offered on the typed row and the empty view, so it stays reachable after hiding everything.
  const manageAction = blocklist && (blocklist.urls.length > 0 || blocklist.hosts.length > 0) && (
    <Action.Push
      title="Manage Hidden Suggestions"
      icon={Icon.EyeDisabled}
      target={<ManageHiddenSuggestions profile={profile} />}
      onPop={() => loadBlocklist(profile).then(setBlocklist)}
    />
  );

  function hideUrl(url: string, site: boolean) {
    if (!blocklist) return;
    const host = hostOf(url);
    if (site && host) hide({ ...blocklist, hosts: [...blocklist.hosts, host] }, `Hidden ${host} from suggestions`);
    else if (!site) hide({ ...blocklist, urls: [...blocklist.urls, url] }, "Hidden from suggestions");
  }

  const sourceActions = <ModeActions current={mode} onChange={setMode} />;

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={mode.placeholder}
      isLoading={isLoading}
      filtering={false}
      selectedItemId={top}
      searchBarAccessory={
        profiles.length > 1 ? (
          <List.Dropdown tooltip="Chrome Profile" value={profile} onChange={changeProfile}>
            {profiles.map((p) => (
              <List.Dropdown.Item key={p.dir} title={p.name} value={p.dir} icon={p.icon} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.Globe}
        title={db ? "Type a URL or Search" : "Chrome History Not Found"}
        description={db ? "Matching pages from your Chrome bookmarks and history will appear here." : undefined}
        actions={
          <ActionPanel>
            {manageAction}
            {sourceActions}
          </ActionPanel>
        }
      />
      {typed && (
        <List.Item
          id="typed"
          icon={Icon.Globe}
          title={typed}
          subtitle={toUrl(typed)}
          actions={
            <ActionPanel>
              <Action
                title="Open in Little Chrome"
                icon={Icon.Window}
                onAction={() => launchLittleChrome(toUrl(typed), profile)}
              />
              <Action
                title="Open in Chrome Tab"
                icon={Icon.Globe}
                onAction={() => openInChromeTab(toUrl(typed), profile)}
              />
              {manageAction}
              {sourceActions}
            </ActionPanel>
          }
        />
      )}
      <List.Section title="Bookmarks" subtitle={profileLabel}>
        {shownBookmarks.map((bookmark) => {
          const favicon = bookmarkFavicons.get(bookmark.url) ?? favicons.get(bookmark.url);
          return (
            <List.Item
              key={`${generation}:bookmark:${bookmark.url}`}
              id={`${generation}:bookmark:${bookmark.url}`}
              icon={favicon ? { source: favicon, fallback: Icon.Bookmark } : Icon.Bookmark}
              title={bookmark.title || bookmark.url}
              subtitle={bookmark.title ? bookmark.url : undefined}
              accessories={bookmark.folder ? [{ text: bookmark.folder }] : undefined}
              actions={
                <ActionPanel>
                  <Action
                    title="Open in Little Chrome"
                    icon={Icon.Window}
                    onAction={() => launchLittleChrome(bookmark.url, profile)}
                  />
                  <Action
                    title="Open in Chrome Tab"
                    icon={Icon.Globe}
                    onAction={() => openInChromeTab(bookmark.url, profile)}
                  />
                  <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
                  <HideActions url={bookmark.url} onHide={hideUrl} manageAction={manageAction} />
                  {sourceActions}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      <List.Section title="History" subtitle={profileLabel}>
        {visible.map((item) => (
          <List.Item
            key={`${generation}:${item.url}`}
            id={`${generation}:${item.url}`}
            icon={item.favicon ? { source: item.favicon, fallback: Icon.Clock } : Icon.Clock}
            title={item.title || item.url}
            subtitle={item.title ? item.url : undefined}
            actions={
              <ActionPanel>
                <Action
                  title="Open in Little Chrome"
                  icon={Icon.Window}
                  onAction={() => launchLittleChrome(item.url, profile)}
                />
                <Action
                  title="Open in Chrome Tab"
                  icon={Icon.Globe}
                  onAction={() => openInChromeTab(item.url, profile)}
                />
                <Action.CopyToClipboard title="Copy URL" content={item.url} />
                <HideActions url={item.url} onHide={hideUrl} manageAction={manageAction} />
                {sourceActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function ModeActions({ current, onChange }: { current: SuggestionMode; onChange: (mode: SuggestionMode) => void }) {
  return (
    <ActionPanel.Section>
      {MODES.filter((m) => m.id !== current.id).map((m) => (
        <Action
          key={m.id}
          title={m.action}
          icon={m.icon}
          shortcut={{ modifiers: ["cmd"], key: m.key }}
          onAction={() => onChange(m)}
        />
      ))}
    </ActionPanel.Section>
  );
}

function HideActions({
  url,
  onHide,
  manageAction,
}: {
  url: string;
  onHide: (url: string, site: boolean) => void;
  manageAction: ReactNode;
}) {
  const host = hostOf(url);
  return (
    <ActionPanel.Section>
      <Action
        title="Hide from Suggestions"
        icon={Icon.EyeDisabled}
        style={Action.Style.Destructive}
        shortcut={{ modifiers: ["ctrl"], key: "x" }}
        onAction={() => onHide(url, false)}
      />
      {host && (
        <Action
          title={`Hide All from ${host}`}
          icon={Icon.EyeDisabled}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
          onAction={() => onHide(url, true)}
        />
      )}
      {manageAction}
    </ActionPanel.Section>
  );
}

const NO_FAVICONS = new Map<string, string>();

// Favicons of the shown pages, looked up once per page and kept until the profile or snapshot changes.
function useFavicons(profile: string, db: string | undefined, urls: string[]): Map<string, string> {
  const cached = useRef<{ profile?: string; db?: string; favicons: Map<string, string>; looked: Set<string> }>({
    favicons: new Map(),
    looked: new Set(),
  });
  const [, setVersion] = useState(0);
  const key = urls.join("\n");
  useEffect(() => {
    if (cached.current.profile !== profile || cached.current.db !== db)
      cached.current = { profile, db, favicons: new Map(), looked: new Set() };
    const current = cached.current;
    const missing = key.split("\n").filter((u) => u && !current.looked.has(u));
    if (!db || !missing.length) return;
    const abort = new AbortController();
    lookupFavicons(db, profile, missing, abort.signal)
      .then((found) => {
        for (const url of missing) current.looked.add(url);
        for (const [url, favicon] of found) current.favicons.set(url, favicon);
        setVersion((v) => v + 1);
      })
      .catch(() => undefined);
    return () => abort.abort();
  }, [profile, db, key]);
  return cached.current.profile === profile && cached.current.db === db ? cached.current.favicons : NO_FAVICONS;
}
