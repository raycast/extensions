import { environment } from "@raycast/api";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { SavedSite, SavedSites, SavedSitesAction, SavedSitesState } from "./types";
import { strCmp, strEq } from "./utils";

const DATA_FILE = join(environment.supportPath, "saved-sites.json");

function sortItemsInPlace(items: SavedSite[]) {
  items.sort(({ title: a }, { title: b }) => strCmp(a, b));
}

export function getDefaultSavedSites(): SavedSites {
  const sites: SavedSites = {
    items: [
      { title: "Bing", url: "https://www.bing.com/search?q={}" },
      { title: "DuckDuckGo", url: "https://duckduckgo.com/?q={}" },
      { title: "GitHub", url: "https://github.com/search?q={}" },
      { title: "Google", url: "https://www.google.com/search?q={}" },
      { title: "npm", url: "https://www.npmjs.com/search?q={}" },
      { title: "Reddit", url: "https://www.reddit.com/search/?q={}" },
      { title: "Stack Overflow", url: "https://stackoverflow.com/search?q={}" },
      { title: "Twitter", url: "https://twitter.com/search?q={}" },
      { title: "Wikipedia (en)", url: "https://en.wikipedia.org/wiki/{}" },
      { title: "YouTube", url: "https://www.youtube.com/results?search_query={}" },
    ],
    defaultSiteTitle: "Google",
  };
  sortItemsInPlace(sites.items);
  return sites;
}

export function loadSavedSites(): SavedSites {
  if (!existsSync(DATA_FILE)) {
    return getDefaultSavedSites();
  }
  try {
    const raw = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw) as SavedSites;
  } catch {
    return getDefaultSavedSites();
  }
}

function persistSavedSites(sites: SavedSites): void {
  const dir = environment.supportPath;
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(DATA_FILE, JSON.stringify(sites, null, 2), "utf-8");
}

export function getExistingTitlesAndUrls(savedSites: SavedSites) {
  const titles: string[] = [];
  const urls: string[] = [];
  for (const { title, url } of savedSites.items) {
    titles.push(title);
    urls.push(url);
  }
  return { titles, urls };
}

function savedSitesReducer(state: SavedSites, action: SavedSitesAction): SavedSites {
  switch (action.type) {
    case "add": {
      const newItems = [
        ...state.items,
        {
          title: action.newTitle,
          url: action.newUrl,
          preferredBrowserBundleId: action.newPreferredBrowserBundleId,
        },
      ];
      sortItemsInPlace(newItems);
      return {
        items: newItems,
        defaultSiteTitle: action.newIsDefault ? action.newTitle : state.defaultSiteTitle,
      };
    }
    case "edit": {
      const newItems = state.items.map((item, i) =>
        i === action.index
          ? {
              title: action.newTitle,
              url: action.newUrl,
              preferredBrowserBundleId: action.newPreferredBrowserBundleId,
            }
          : item,
      );
      sortItemsInPlace(newItems);
      let defaultTitle = state.defaultSiteTitle;
      if (action.newIsDefault) {
        defaultTitle = action.newTitle;
      } else if (action.oldIsDefault) {
        defaultTitle = undefined;
      }
      return { items: newItems, defaultSiteTitle: defaultTitle };
    }
    case "delete": {
      const deletedItem = state.items[action.index];
      const items = state.items.filter((_, i) => i !== action.index);
      return {
        items,
        defaultSiteTitle: strEq(deletedItem?.title ?? "", state.defaultSiteTitle ?? "")
          ? undefined
          : state.defaultSiteTitle,
      };
    }
    default:
      return state;
  }
}

/** Apply an action, persist the result, and update React state. */
export function updateSavedSites({ savedSites: oldSites, setSavedSites }: SavedSitesState, action?: SavedSitesAction) {
  const savedSites = action ? savedSitesReducer(oldSites, action) : { ...oldSites };
  persistSavedSites(savedSites);
  setSavedSites(savedSites);
  return savedSites;
}
