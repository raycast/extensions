import { homedir } from "os";
import { isIP } from "net";
import { URL } from "url";
import { HistoryItem, Tab } from "src/types";
import { join } from "path";
import { Color, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { parse as parseTld } from "tldts";

export function extractDomainName(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.host.replace("www.", "");
  } catch {
    return "";
  }
}

export function unique(strings: string[]) {
  return strings.filter((str, index) => strings.indexOf(str) === index);
}

const dtf = new Intl.DateTimeFormat(undefined, {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function groupHistoryByDay(groups: Map<string, HistoryItem[]>, entry: HistoryItem) {
  const date = dtf.format(new Date(entry.lastVisitDate));
  if (!date) {
    return groups;
  }

  const group = groups.get(date) ?? [];
  group.push(entry);
  groups.set(date, group);
  return groups;
}

export function getOrionBasePath() {
  return join(homedir(), "Library", "Application Support", getOrionAppIdentifier());
}

export function getOrionAppIdentifier() {
  return getPreferenceValues()["orion-rc"] ? "Orion RC" : "Orion";
}

export function getFavoritesPath(profile: string) {
  const profileFolder = profile;
  return join(getOrionBasePath(), profileFolder, "favourites.plist");
}

export function getHistoryPath(profile: string) {
  const profileFolder = profile;
  return join(getOrionBasePath(), profileFolder, "history");
}

export function getReadingListPath(profile: string) {
  const profileFolder = profile;
  return join(getOrionBasePath(), profileFolder, "reading_list.plist");
}

export function getProfilesPath() {
  return join(getOrionBasePath(), "profiles");
}

export const executeJxa = async (script: string, options?: { silent?: boolean }) => {
  try {
    return await runAppleScript(script, { language: "JavaScript", humanReadableOutput: false });
  } catch (err: unknown) {
    console.log(err);
    if (options?.silent) return undefined;
    if (typeof err === "string") {
      const message = err.replace("execution error: Error: ", "");
      if (message.match(/Application can't be found/)) {
        showToast({
          style: Toast.Style.Failure,
          title: "Application not found",
          message: "Things must be running",
        });
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "Something went wrong",
          message: message,
        });
      }
    }
  }
};

// Folds a string to a diacritic-insensitive, case-insensitive form (NFD
// decomposes an accented letter into its base letter plus a combining accent
// mark, which the second step then strips), so a query typed without accents
// still substring-matches text that has them.
export const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function splitSearchTerms(text: string): string[] {
  return text.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

export function search<T extends object>(collection: T[], keys: string[], searchText: string): T[] {
  return collection.filter((item) =>
    keys.some((key) => normalizeText((item as Record<string, string>)[key]).includes(normalizeText(searchText))),
  );
}

// A URL is a destination, not a tab identity: several windows can have the
// same URL open simultaneously. Keep the window-local index in every List ID
// so actions always address the instance the user selected.
export function getTabKey(tab: Tab) {
  return `tab-${tab.window_id}-${tab.tab_index}`;
}

export function getTitle(tab: Tab) {
  let truncated = tab.title.substring(0, 75);
  if (truncated.length < tab.title.length) {
    truncated += "...";
  }
  return truncated;
}

export const getUrlDomain = (url: string) => {
  const parsedUrl = parseUrl(url);
  if (parsedUrl && parsedUrl.hostname) {
    return parsedUrl.hostname.replace(/^www\./, "");
  }
};

export const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

export const idToColor = (id: number) => {
  switch (id) {
    case 0:
      return "#98989D";
    case 1:
      return "#CC66FF";
    case 2:
      return "#F7509E";
    case 3:
      return "#FF5045";
    case 4:
      return "#FFA915";
    case 5:
      return "#FFE018";
    case 6:
      return "#3EFD56";
    case 7:
      return "#A2A2A7";
  }
  return Color.PrimaryText;
};

// --- Command Bar: search engine + opening URLs in Orion ---

export type SearchEngine = "duckduckgo" | "google" | "brave" | "kagi";

const SEARCH_ENGINES: Record<SearchEngine, { name: string; search: string; suggest: string | null }> = {
  duckduckgo: {
    name: "DuckDuckGo",
    search: "https://duckduckgo.com/?q=",
    suggest: "https://duckduckgo.com/ac/?type=list&q=",
  },
  google: {
    name: "Google",
    search: "https://www.google.com/search?q=",
    suggest: "https://suggestqueries.google.com/complete/search?client=firefox&q=",
  },
  brave: {
    name: "Brave",
    search: "https://search.brave.com/search?q=",
    suggest: "https://search.brave.com/api/suggest?source=web&q=",
  },
  kagi: {
    name: "Kagi",
    search: "https://kagi.com/search?q=",
    suggest: null,
  },
};

export function getSearchEngine(): SearchEngine {
  const value = getPreferenceValues<Preferences>().searchEngine;
  return value in SEARCH_ENGINES ? value : "duckduckgo";
}

export function getSearchEngineName(engine: SearchEngine = getSearchEngine()) {
  return SEARCH_ENGINES[engine].name;
}

export function buildSearchUrl(query: string, engine: SearchEngine = getSearchEngine()) {
  return SEARCH_ENGINES[engine].search + encodeURIComponent(query);
}

function getRawHost(candidate: string): string | undefined {
  const authority = candidate.replace(/^https?:\/\//i, "").split(/[/?#]/, 1)[0];
  if (!authority || authority.includes("@")) return undefined;

  const ipv6 = authority.match(/^\[([^\]]+)\](?::\d*)?$/);
  if (ipv6) return ipv6[1];

  const host = authority.match(/^([^:]+)(?::\d*)?$/);
  return host?.[1]?.toLowerCase();
}

function isCanonicalIPv4(host: string): boolean {
  const parts = host.split(".");
  return parts.length === 4 && parts.every((part) => /^(?:0|[1-9]\d{0,2})$/.test(part) && Number(part) <= 255);
}

// Accept the address forms people reasonably expect from an omnibox. This
// deliberately checks the raw hostname before URL parsing: Node's URL parser
// coerces a bare number such as `1` to an IPv4-looking hostname, even though a
// user entering just `1` intends to search rather than open `https://1`.
//
// A space means this is a search query. A bare hostname must be localhost, a
// canonical IP address, or a domain with a TLD. Explicit http(s) URLs are
// accepted as a deliberate navigation request, including single-label hosts
// used on private networks.
export function isWebAddress(value: string): boolean {
  const candidate = value.trim();
  if (!candidate || /\s/.test(candidate)) return false;

  const hasExplicitProtocol = /^https?:\/\//i.test(candidate);
  const url = parseUrl(hasExplicitProtocol ? candidate : `https://${candidate}`);
  if (!url) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (hasExplicitProtocol) return !!url.hostname;

  const host = getRawHost(candidate);
  if (!host) return false;
  if (host === "localhost") return true;
  if (isCanonicalIPv4(host)) return true;
  if (isIP(host) === 6) return true;

  // Validate against the Public Suffix List rather than accepting any
  // "label.2+ letters" shape - that pattern also matches file-like text such
  // as `index.html`, `main.js`, or `file.txt`, which are not web addresses.
  // Single-label hosts stay searches unless the user deliberately included an
  // http(s) scheme.
  //
  // A bare public suffix (`domain` null) is not a website: some brand-owned
  // gTLDs are themselves ordinary words (`goog`, `abc`, `app`, `dev`), so a
  // one-word search query can otherwise land exactly on a real ICANN suffix
  // with no domain label in front of it.
  const { isIcann, isPrivate, domain } = parseTld(host, { allowPrivateDomains: true });
  return domain !== null && (isIcann === true || isPrivate === true);
}

export function normalizeWebAddress(value: string): string {
  const candidate = value.trim();
  return /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
}

// Returns null for engines (e.g. Kagi) that have no public autocomplete endpoint.
export function buildSuggestUrl(query: string, engine: SearchEngine = getSearchEngine()): string | null {
  const base = SEARCH_ENGINES[engine].suggest;
  return base ? base + encodeURIComponent(query) : null;
}

// Always open a URL in Orion rather than the system default browser.
export async function openInOrion(url: string) {
  await open(url, getOrionAppIdentifier());
}

// A "launcher tab" is the blank tab Orion leaves behind when its homepage /
// new-tab is set to the Command Bar deeplink (its URL is the raycast:// scheme).
export function isLauncherTab(url: string) {
  return url.startsWith("raycast://");
}

// Close those blank launcher tabs. When a window only has launcher tabs, navigate
// the survivor to about:blank instead of closing it (emptying the window). Call
// this only while acting on a result (the palette is dismissing) — closing on
// every palette open re-fires the deeplink and loops.
export async function closeLauncherTabs() {
  if (getPreferenceValues<Preferences>().autoCloseLauncherTabs === false) {
    return;
  }
  await executeJxa(`
    const orion = Application("${getOrionAppIdentifier()}");
    orion.windows().forEach((w) => {
      let urls;
      try { urls = w.tabs.url(); } catch (e) { return; }
      const idx = [];
      for (let i = 0; i < urls.length; i++) {
        if (typeof urls[i] === "string" && urls[i].indexOf("raycast://") === 0) idx.push(i);
      }
      if (idx.length === 0) return;
      const blankLauncher = (i) => { try { w.tabs[i].url = "about:blank"; } catch (e) {} };
      // Every tab is a launcher tab: close extras but keep one window tab, navigated
      // away from the deeplink so it can't re-fire the palette.
      if (idx.length >= urls.length) {
        for (let j = idx.length - 2; j >= 0; j--) {
          try { w.tabs[idx[j]].close(); } catch (e) {}
        }
        blankLauncher(idx[idx.length - 1]);
        return;
      }
      // Close highest index first so earlier closes don't shift later indices.
      for (let j = idx.length - 1; j >= 0; j--) {
        try { w.tabs[idx[j]].close(); } catch (e) {}
      }
    });
  `);
}
