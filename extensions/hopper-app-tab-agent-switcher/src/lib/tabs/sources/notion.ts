// Notion desktop: the tabs in its tab bar, a web view titled "Tab Bar" whose tabs are buttons named after
// their page (the close, new-tab and navigation buttons only have descriptions). Tabs report no selection;
// the window's title is its selected tab's. Accessibility reaches the tab bar of the front window only, so
// Notion's other windows are listed as windows. A tab whose page URL is known opens with a notion:// deep link
// carrying `deepLinkOpenNewTab=true`: Notion then switches to the tab showing that page, in any window, or
// opens it in a new tab (so closed tabs reopen too). Without that parameter the link replaces the current tab.
// Notion compares the URL's last path segment exactly ("Q-A-<id>", not just the id), so the tab's own URL is used.
//
// Each tab's detail is its page's parents (ADR-016): every tab keeps a web view whose URL ends in the page id,
// and Notion's local cache (notion.db) links each page to its parent.
//
// Tabs are matched to their web views by title. Web views are read window by window, front first, so a title the
// front tab bar shows n times takes the first n different page URLs with that title: two pages both named
// "Roadmap" are two entries, each with its own page, while one page open in two tabs stays one entry.

import type { App, AppWindows, Platform, Tab, TabSource, WebPage } from "../model";
import { fromRows, openSidebarEntry, type SidebarRef, type SidebarSpec } from "./sidebar";
import { fromWindows } from "./windows";

const TAB_BAR: SidebarSpec = {
  id: "notion",
  bundleId: "notion.id",
  kind: "tab",
  container: "Tab Bar",
  rowRole: "AXButton",
  format: "plain",
};

const DB = "Library/Application Support/Notion/notion.db";

/** Longest parent path shown before the farthest parents are replaced with "…". */
const MAX_PATH = 36;
const SEPARATOR = " / ";

/**
 * Tabs of the front window, each with its page URL when a web view shows it (see the top of this file), then
 * Notion's other windows. Tabs with the same page appear once.
 */
export function fromTabBar(app: App, names: string[], appWindows: AppWindows["windows"], pages: WebPage[] = []): Tab[] {
  const [front, ...others] = appWindows;
  const urlsByTitle = new Map<string, string[]>();
  for (const page of pages) {
    const urls = urlsByTitle.get(page.title) ?? [];
    if (!urls.includes(page.url)) urlsByTitle.set(page.title, [...urls, page.url]);
  }
  const count = (title: string) => names.filter((name) => name === title).length;
  const rows = [...new Set(names)].map((title) => ({ title, text: "", selected: false }));
  const tabs = fromRows(app, TAB_BAR, rows, front?.title).flatMap((tab): Tab<Ref>[] => {
    const urls = (urlsByTitle.get(tab.title) ?? []).slice(0, count(tab.title));
    if (urls.length <= 1) return [urls[0] ? { ...tab, ref: { ...tab.ref, url: urls[0] } } : tab];
    return urls.map((url) => ({ ...tab, key: `${tab.key}:${pageId(url) ?? url}`, ref: { ...tab.ref, url } }));
  });
  return [...tabs, ...fromWindows(app, others).map((t) => ({ ...t, active: false }))];
}

/** The page id (dashed UUID) at the end of a Notion page URL, e.g. ".../p/Looper-3c1b...3569". */
export function pageId(url: string): string | undefined {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return undefined;
  }
  const hex = /([0-9a-f]{32})$/i.exec(path)?.[1]?.toLowerCase();
  return hex && `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Each page's ancestors in notion.db, nearest first: follows parent_id through blocks and databases
 * (collections) up to the workspace. Titles are joined from their text segments.
 */
export function ancestorsQuery(ids: string[]): string {
  const list = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id)).map((id) => `'${id}'`);
  const title = (json: string) => `(select group_concat(json_extract(value, '$[0]'), '') from json_each(${json}))`;
  return `with recursive p(root, id, tab, depth) as (
  select id, id, 'block', 0 from block where id in (${list.join(", ")})
  union all
  select p.root, coalesce(b.parent_id, c.parent_id), coalesce(b.parent_table, c.parent_table), p.depth + 1
  from p left join block b on p.tab = 'block' and b.id = p.id
  left join collection c on p.tab = 'collection' and c.id = p.id
  where p.depth < 30 and p.tab in ('block', 'collection') and coalesce(b.parent_id, c.parent_id) is not null
)
select p.root, p.depth, p.tab, b.type, coalesce(${title("b.properties, '$.title'")}, ${title("c.name")}) as title
from p left join block b on p.tab = 'block' and b.id = p.id
left join collection c on p.tab = 'collection' and c.id = p.id
where p.depth > 0 order by p.root, p.depth`;
}

/**
 * Page id → titles of its parent pages and databases, nearest first. Other blocks on the way (a page nested
 * in a bulleted list or toggle) and the workspace are skipped, as in Notion's own breadcrumb.
 */
export function parseAncestors(rows: Record<string, unknown>[]): Map<string, string[]> {
  const parents = new Map<string, string[]>();
  for (const row of rows) {
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const isParent = row.tab === "collection" || (row.tab === "block" && row.type === "page");
    if (!title || !isParent || typeof row.root !== "string") continue;
    parents.set(row.root, [...(parents.get(row.root) ?? []), title]);
  }
  return parents;
}

/** "Root / … / Parent" shortened to `max` characters: the nearest parents are kept, farther ones become "…". */
export function shortPath(parents: string[], max = MAX_PATH): string {
  if (parents.length === 0) return "";
  const clip = (s: string) => (s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s);
  let shown = [clip(parents[0])];
  for (const parent of parents.slice(1)) {
    const next = [parent, ...shown];
    if (next.join(SEPARATOR).length > max) return ["…", ...shown].join(SEPARATOR);
    shown = next;
  }
  return shown.join(SEPARATOR);
}

type Ref = SidebarRef & { url?: string };

/** The deep link that switches to the tab showing `url` (a Notion page URL), or opens it in a new tab. */
export function tabLink(url: string): string | undefined {
  try {
    const link = new URL(url);
    if (link.protocol !== "https:") return undefined;
    link.searchParams.set("deepLinkOpenNewTab", "true");
    return `notion://${link.host}${link.pathname}${link.search}`;
  } catch {
    return undefined;
  }
}

/** Page id → its parents (nearest first), for the open pages found in the cache. */
async function readParents(pages: WebPage[], platform: Platform): Promise<Map<string, string[]>> {
  const ids = [...new Set(pages.flatMap((page) => pageId(page.url) ?? []))];
  if (ids.length === 0) return new Map();
  return parseAncestors(await platform.querySqlite(`${platform.homeDir()}/${DB}`, ancestorsQuery(ids)));
}

/**
 * Sets each tab's detail to its page's parents: shortened for display, in full for hover and search. The page URL
 * stays in the ref only: `Tab.url` would replace the parents shown as detail with the host.
 */
export function withParents(tabs: Tab[], parents: Map<string, string[]>): Tab[] {
  return tabs.map((tab) => {
    const url = tab.source === TAB_BAR.id ? (tab.ref as Ref).url : undefined;
    const id = url && pageId(url);
    const path = id ? parents.get(id) : undefined;
    if (!path?.length) return tab;
    return { ...tab, detail: shortPath(path), detailFull: [...path].reverse().join(SEPARATOR) };
  });
}

export const notion: TabSource<Ref> = {
  id: TAB_BAR.id,
  bundleIds: [TAB_BAR.bundleId],
  list: async (app: App, platform: Platform) => {
    // Page URLs and parents are extra: no page views, no cache, or a changed schema just means none. Failures
    // other than a missing cache are reported: a changed schema is worth knowing about.
    const pagesRead = platform.webPages(app.bundleId).catch((error: unknown) => {
      platform.reportError(error, "tabs: notion pages");
      return [] as WebPage[];
    });
    const [rows, all, pages, parents] = await Promise.all([
      platform.sidebarRows(app.bundleId, TAB_BAR),
      platform.windows([app.bundleId]),
      pagesRead,
      pagesRead
        .then((pages) => readParents(pages, platform))
        .catch((error: unknown) => {
          platform.reportError(error, "tabs: notion parents");
          return new Map<string, string[]>();
        }),
    ]);
    const appWindows = all.find((w) => w.bundleId === app.bundleId)?.windows ?? [];
    // Tab bar not found (hidden, or Notion's UI changed): offer its windows instead.
    if (rows.length === 0) return fromWindows(app, appWindows) as Tab[] as Tab<Ref>[];
    const tabs = fromTabBar(
      app,
      rows.map((r) => r.title),
      appWindows,
      pages,
    );
    return withParents(tabs, parents) as Tab<Ref>[];
  },
  // Window entries carry source "windows", so their selection is routed there, not here.
  select: async (tab, platform) => {
    const link = tab.ref.url && tabLink(tab.ref.url);
    if (link) await platform.openUrl(link);
    else await openSidebarEntry(tab, TAB_BAR, platform);
  },
  reopenTarget: (tab) => {
    const link = tab.ref.url && tabLink(tab.ref.url);
    return link ? { kind: "url", target: link } : undefined;
  },
  // The page's notion.so address, what Notion's own Copy Link gives: it opens in Notion or a browser, for anyone
  // the page is shared with.
  link: (tab) => tab.ref.url,
};
