import { environment } from "@raycast/api";
import path from "node:path";
import { readFileSync, writeFileSync } from "fs";
import { strCmp, strEq } from "./utils";

export const SEARCH_TEMPLATE = "{}";

export interface SavedSite {
  title: string;
  url: string;
}

export type FormData = SavedSite & { isDefault: boolean };

export interface SavedSites {
  items: SavedSite[];
  defaultSiteTitle?: string;
}

export interface SavedSitesState {
  savedSites: SavedSites;
  setSavedSites: (_: SavedSites) => void;
}

// export type SavedSitesState = [SavedSites, (_: SavedSites) => void];

const SAVED_SITES_FILEPATH = path.join(environment.supportPath, "saved_searches.json");

export function getSavedSitesFromDisk() {
  try {
    const contents = readFileSync(SAVED_SITES_FILEPATH, { encoding: "utf8" });
    return JSON.parse(contents) as SavedSites;
  } catch {
    return { items: [] };
  }
}

function writeSavedSitesToDisk(savedSites: SavedSites) {
  return writeFileSync(SAVED_SITES_FILEPATH, JSON.stringify(savedSites));
}

export function getExistingTitlesAndUrls(savedSites: SavedSites) {
  const titles = [] as string[];
  const urls = [] as string[];
  for (const { title, url } of savedSites.items) {
    titles.push(title);
    urls.push(url);
  }
  return { titles, urls };
}

export type SavedSitesEditingKind = { type: "edit"; index: number } | { type: "add" };
export type SavedSitesAction =
  | (({ type: "edit"; index: number; oldIsDefault: boolean } | { type: "add" }) & {
      newTitle: string;
      newUrl: string;
      newIsDefault: boolean;
    })
  | { type: "delete"; index: number };

function sortItemsInPlace(items: SavedSite[]) {
  items.sort(({ title: title1 }, { title: title2 }) => strCmp(title1, title2));
}

function editSavedSiteAtIndex(
  savedSites: SavedSites,
  index: number,
  { title, url, wasOldDefault, isNewDefault }: SavedSite & { wasOldDefault: boolean; isNewDefault: boolean },
): SavedSites {
  const defaultSiteTitle = (() => {
    if (isNewDefault) {
      return title;
    } else if (wasOldDefault) {
      return undefined;
    } else {
      return savedSites.defaultSiteTitle;
    }
  })();

  const newItems = savedSites.items.map((item, i) => (i === index ? { title, url } : item));
  sortItemsInPlace(newItems);

  return { items: newItems, defaultSiteTitle };
}

function addSavedSite(savedSites: SavedSites, { title, url, isDefault }: FormData): SavedSites {
  const defaultSiteTitle = isDefault ? title : savedSites.defaultSiteTitle;

  const newItems = [...savedSites.items, { title, url }];
  sortItemsInPlace(newItems);

  return { items: newItems, defaultSiteTitle };
}

function deleteSavedSiteAtIndex(savedSites: SavedSites, index: number): SavedSites {
  const deletedItem = savedSites.items[index];
  const defaultSiteTitle = strEq(deletedItem.title, savedSites.defaultSiteTitle ?? "")
    ? undefined
    : savedSites.defaultSiteTitle;
  return { items: savedSites.items.filter((_, i) => i !== index), defaultSiteTitle };
}

function savedSitesReducer(savedSites: SavedSites, action: SavedSitesAction) {
  switch (action.type) {
    case "add": {
      const { newTitle: title, newUrl: url, newIsDefault: isDefault } = action;
      savedSites = addSavedSite(savedSites, { title, url, isDefault });
      break;
    }
    case "delete": {
      const { index } = action;
      savedSites = deleteSavedSiteAtIndex(savedSites, index);
      break;
    }
    case "edit": {
      const { newTitle: title, newUrl: url, oldIsDefault, newIsDefault, index } = action;
      savedSites = editSavedSiteAtIndex(savedSites, index, {
        title,
        url,
        wasOldDefault: oldIsDefault,
        isNewDefault: newIsDefault,
      });
      break;
    }
  }

  savedSites = { ...savedSites };

  return savedSites;
}

export function updateSavedSites(
  { savedSites: oldSavedSites, setSavedSites }: SavedSitesState,
  action?: SavedSitesAction,
) {
  const savedSites = action !== undefined ? savedSitesReducer(oldSavedSites, action) : { ...oldSavedSites };
  writeSavedSitesToDisk(savedSites);
  setSavedSites(savedSites);
  return savedSites;
}

export function getDefaultSavedSites(): SavedSites {
  const savedSites: SavedSites = {
    items: [
      { title: "Bing", url: "https://www.bing.com/search?q={}" },
      { title: "DuckDuckGo", url: "https://duckduckgo.com/?q={}" },
      { title: "GitHub", url: "https://github.com/search?q={}" },
      { title: "Google", url: "https://www.google.com/search?q={}" },
      { title: "StackOverflow", url: "https://stackoverflow.com/search?q={}" },
      { title: "Twitter", url: "https://twitter.com/search?q={}" },
      { title: "Wikipedia (en)", url: "https://en.wikipedia.org/wiki/{}" },
      { title: "YouTube", url: "https://www.youtube.com/results?search_query={}" },
    ],
    defaultSiteTitle: "Google",
  };

  sortItemsInPlace(savedSites.items);

  return savedSites;
}
