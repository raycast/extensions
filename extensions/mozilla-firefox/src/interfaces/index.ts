import { Image } from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { ReactElement } from "react";

export interface Preferences {
  readonly searchEngine: string;
  readonly browserApp: string;
}

export interface Tab {
  readonly title: string;
  readonly url: string;
}

export function parseTab(entry: { url: string; title: string }): Tab {
  return { title: entry.title, url: entry.url };
}

export function getUrlWithoutScheme(tab: Tab): string {
  return tab.url.replace(/(^\w+:|^)\/\//, "").replace("www.", "");
}

export function getTabFavicon(tab: Tab): Image.ImageLike {
  return getFavicon(tab.url);
}

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisited: Date;
}

export interface SearchResult<T> {
  data?: T[];
  errorView?: ReactElement;
  isLoading: boolean;
}

export type GroupedEntries = Map<string, HistoryEntry[]>;
