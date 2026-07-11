import { homedir } from "os";
import { URL } from "url";
import { HistoryItem, Tab } from "src/types";
import { join } from "path";
import { Color, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

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

export const executeJxa = async (script: string) => {
  try {
    return await runAppleScript(script, { language: "JavaScript", humanReadableOutput: false });
  } catch (err: unknown) {
    console.log(err);
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

const normalizeText = (text: string) =>
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
