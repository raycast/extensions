export type Source = "tab" | "bookmark" | "history";
export type Scope = Source | "all";
export type Range = [number, number];

export interface Profile {
  id: string;
  name: string;
  path: string;
}

export type ChromeTabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

export interface ChromeTabGroup {
  id: string;
  title: string;
  color: ChromeTabGroupColor;
}

export interface BrowserEntry {
  id: string;
  source: Source;
  title: string;
  url: string;
  profile?: Profile;
  tabId?: string;
  windowId?: string;
  active?: boolean;
  /** 仅接收真实浏览器元数据；当前 JXA 标签采集不提供此字段。 */
  lastAccessed?: number;
  tabGroup?: ChromeTabGroup;
  incognito?: boolean;
  folder?: string;
  visitedAt?: number;
}

export interface SearchResult {
  entry: BrowserEntry;
  titleRanges: Range[];
  urlRanges: Range[];
  score: number;
}

export const sourceNames: Record<Source, string> = {
  tab: "Tab",
  bookmark: "Bookmark",
  history: "History",
};
