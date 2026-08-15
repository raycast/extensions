export type AsideWindowMode = "normal" | "incognito" | string;

export interface AsideTab {
  id: string;
  windowId: string;
  windowIndex: number;
  windowMode: AsideWindowMode;
  title: string;
  url: string;
  loading: boolean;
  active: boolean;
}

export interface AsideBookmark {
  id: string;
  title: string;
  url: string;
  path: string[];
}

export interface BrowserMutationResult {
  ok: true;
  tabId?: string;
  windowId?: string;
  url?: string;
}

export type TabActionKind = "focus" | "close" | "reload" | "copy";

export interface Preferences {
  searchEngine: "google" | "duckduckgo" | "kagi" | "brave" | "bing";
}
