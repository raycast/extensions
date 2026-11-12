import {
  Action,
  ActionPanel,
  closeMainWindow,
  environment,
  getApplications,
  Icon,
  Image,
  List,
  open,
  popToRoot,
} from "@raycast/api";
import { executeSQL, usePromise, useSQL } from "@raycast/utils";
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { useState } from "react";
import { Row, Suggestion, suggest } from "./rank";

const SEARCH_URL = "https://www.google.com/search?q=%s";

// Chromium "User Data" dir per OS, relative to the home folder, and the app names Raycast knows the browser by.
// Paths: HackBrowserData's browser table (github.com/moonD4rk/HackBrowserData, internal/browser/table.go)
// and the Store extensions for Dia, Comet, Helium and Browser History. Unknown app name = system default browser.
// ponytail: Arc on Windows is an MSIX package (Packages/TheBrowserCompany.Arc_*), needs a glob; skipped, Arc sunsets 2026-12.
type Browser = { names: string[]; win?: string; mac?: string };
const L = "AppData/Local/";
const R = "AppData/Roaming/";
const M = "Library/Application Support/";
const BROWSERS: Browser[] = [
  { names: ["Google Chrome"], win: L + "Google/Chrome/User Data", mac: M + "Google/Chrome" },
  { names: ["Google Chrome Beta"], win: L + "Google/Chrome Beta/User Data", mac: M + "Google/Chrome Beta" },
  { names: ["Google Chrome Dev"], win: L + "Google/Chrome Dev/User Data", mac: M + "Google/Chrome Dev" },
  { names: ["Google Chrome Canary"], win: L + "Google/Chrome SxS/User Data", mac: M + "Google/Chrome Canary" },
  { names: ["Chromium"], win: L + "Chromium/User Data", mac: M + "Chromium" },
  { names: ["Microsoft Edge"], win: L + "Microsoft/Edge/User Data", mac: M + "Microsoft Edge" },
  {
    names: ["Brave", "Brave Browser"],
    win: L + "BraveSoftware/Brave-Browser/User Data",
    mac: M + "BraveSoftware/Brave-Browser",
  },
  {
    names: ["Yandex", "Yandex Browser", "Яндекс", "Яндекс Браузер"],
    win: L + "Yandex/YandexBrowser/User Data",
    mac: M + "Yandex/YandexBrowser",
  },
  { names: ["Vivaldi"], win: L + "Vivaldi/User Data", mac: M + "Vivaldi" },
  // Opera keeps a single profile directly in this dir (no Default/ subfolder); detect() handles both layouts.
  { names: ["Opera", "Opera Browser"], win: R + "Opera Software/Opera Stable", mac: M + "com.operasoftware.Opera" },
  {
    names: ["Opera GX", "Opera GX Browser"],
    win: R + "Opera Software/Opera GX Stable",
    mac: M + "com.operasoftware.OperaGX",
  },
  { names: ["Arc"], mac: M + "Arc/User Data" },
  { names: ["Dia"], mac: M + "Dia/User Data" },
  { names: ["Comet"], win: L + "Perplexity/Comet/User Data", mac: M + "Comet" },
  { names: ["Helium"], win: L + "imput/Helium/User Data", mac: M + "net.imput.helium" },
  { names: ["ChatGPT Atlas"], mac: M + "com.openai.atlas/browser-data/host" },
  { names: ["Cốc Cốc", "CocCoc"], win: L + "CocCoc/Browser/User Data", mac: M + "Coccoc" },
  { names: ["Iridium"], mac: M + "Iridium" },
  { names: ["360 Speed X", "360极速浏览器X"], win: L + "360ChromeX/Chrome/User Data" },
  { names: ["360 Speed", "360极速浏览器"], win: L + "360chrome/Chrome/User Data" },
  { names: ["QQ Browser", "QQ浏览器"], win: L + "Tencent/QQBrowser/User Data" },
  { names: ["Sogou Explorer", "搜狗高速浏览器"], win: L + "Sogou/SogouExplorer/User Data" },
];

const isWin = process.platform === "win32";

/**
 * The browser + profile you actually use: every installed Chromium browser and profile
 * (Default, Profile 1, …) is a candidate, the one whose History was written most recently wins.
 * A fixed priority list would always pick Edge on Windows, since it's preinstalled.
 */
function detect(): { browser: Browser; dir: string } | undefined {
  const found = BROWSERS.flatMap((browser) => {
    const rel = isWin ? browser.win : browser.mac;
    if (!rel) return [];
    const userData = join(homedir(), ...rel.split("/"));
    let profiles: string[];
    try {
      profiles = readdirSync(userData);
    } catch {
      return [];
    }
    return [userData, ...profiles.map((p) => join(userData, p))]
      .filter((dir) => existsSync(join(dir, "History")))
      .map((dir) => ({ browser, dir, mtime: statSync(join(dir, "History")).mtimeMs }));
  });
  return found.sort((a, b) => b.mtime - a.mtime)[0];
}

// Like the Zen reference: let the OS resolve the app by name instead of hardcoding an executable.
async function openInBrowser(browser: Browser | undefined, url: string) {
  const names = new Set(browser?.names.map((n) => n.toLowerCase()));
  const app = (await getApplications()).find((a) => names.has(a.name.toLowerCase()));
  try {
    await open(url, app);
  } catch {
    await open(url); // app found but refused the URL: system default browser still gets the user there
  }
  await closeMainWindow({ clearRootSearch: true });
  await popToRoot();
}

const sqlText = (s: string) => `'${s.replace(/'/g, "''")}'`;
const escapeLike = (term: string) => term.replace(/'/g, "''").replace(/[\\%_]/g, "\\$&");

// Fetch candidates broadly, rank precisely in rank.ts.
function candidatesSql(query: string): string {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  const where = terms
    .map((t) => `(url LIKE '%${escapeLike(t)}%' ESCAPE '\\' OR title LIKE '%${escapeLike(t)}%' ESCAPE '\\')`)
    .join(" AND ");
  // Chromium time is µs since 1601 and exceeds 2^53, so convert to unix ms inside SQLite.
  return `SELECT url, title, visit_count, typed_count, last_visit_time / 1000 - 11644473600000 AS last_visit_ms FROM urls
          WHERE hidden = 0 ${where ? `AND ${where}` : ""}
          ORDER BY visit_count DESC LIMIT 500;`;
}

const originOf = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
};

const FAVICON_DIR = join(environment.supportPath, "favicons");

/** Largest favicon per origin from the profile's own Favicons DB, cached as PNG files. Nothing leaves the machine. */
async function loadFavicons(profileDir: string, origins: string[]): Promise<Record<string, string>> {
  const db = join(profileDir, "Favicons");
  if (!existsSync(db)) return {};
  // page_url range instead of LIKE so the icon_mapping_page_url_idx index is used ('0' sorts right after '/').
  const perOrigin = origins.map(
    (o) => `SELECT * FROM (SELECT ${sqlText(o)} AS origin, b.id || '-' || (b.last_updated / 1000000) AS key,
              hex(b.image_data) AS data
            FROM icon_mapping m JOIN favicon_bitmaps b ON b.icon_id = m.icon_id
            WHERE m.page_url >= ${sqlText(o + "/")} AND m.page_url < ${sqlText(o + "0")}
            ORDER BY b.width DESC LIMIT 1)`,
  );
  const rows = await executeSQL<{ origin: string; key: string; data: string }>(db, perOrigin.join(" UNION ALL "));
  mkdirSync(FAVICON_DIR, { recursive: true });
  return Object.fromEntries(
    rows.map((r) => {
      const file = join(FAVICON_DIR, `${r.key}.png`);
      if (!existsSync(file)) writeFileSync(file, Buffer.from(r.data, "hex"));
      return [r.origin, file];
    }),
  );
}

function useFavicons(profileDir: string | undefined, items: Suggestion[]): Record<string, string> {
  const origins = [...new Set(items.filter((s) => s.kind === "history").map((s) => originOf(s.url)))].filter(Boolean);
  const { data } = usePromise(loadFavicons, [profileDir ?? "", origins], {
    execute: !!profileDir && origins.length > 0,
    onError: () => undefined, // icons are cosmetic; generic globe stays
  });
  return data ?? {};
}

const icon = (s: Suggestion, favicons: Record<string, string>): Image.ImageLike =>
  s.kind === "search"
    ? Icon.MagnifyingGlass
    : s.kind === "url"
      ? Icon.Link
      : favicons[originOf(s.url)]
        ? { source: favicons[originOf(s.url)], fallback: Icon.Globe }
        : Icon.Globe;

const detected = detect();

export default function Command() {
  const [query, setQuery] = useState("");
  const history = detected ? join(detected.dir, "History") : "";
  const { data, isLoading, error, revalidate, permissionView } = useSQL<Row>(history, candidatesSql(query), {
    execute: !!detected,
  });

  const items = suggest(query, data ?? [], SEARCH_URL);
  const favicons = useFavicons(detected?.dir, items);

  if (permissionView) return permissionView;

  return (
    <List
      filtering={false}
      onSearchTextChange={setQuery}
      isLoading={!!detected && isLoading}
      searchBarPlaceholder="Site or search query"
      throttle
    >
      {!detected && (
        <List.EmptyView
          title="No Chrome or Chromium browser history found"
          description={BROWSERS.map((b) => b.names[0]).join(", ")}
        />
      )}
      {error && (
        <List.EmptyView
          icon={Icon.Warning}
          title="Cannot read browser history"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      )}
      {items.map((s) => (
        <List.Item
          key={`${s.kind}:${s.url}`}
          icon={icon(s, favicons)}
          title={s.title}
          subtitle={s.subtitle}
          actions={
            <ActionPanel>
              <Action
                title={`Open in ${detected?.browser.names[0] ?? "Browser"}`}
                icon={Icon.Globe}
                onAction={() => openInBrowser(detected?.browser, s.url)}
              />
              <Action.CopyToClipboard title="Copy URL" content={s.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
