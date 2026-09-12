import { ArticleState } from "./article";

export interface BrowserTab {
  id: number;
  url: string;
  title?: string;
  active: boolean;
  favicon?: string;
}

export type BrowserContentResult = { success: true; article: ArticleState } | { success: false; error: string };

/**
 * Result from trying to get content from an open tab.
 * Includes tab info so the UI can offer to activate the tab if content fetch fails.
 */
export type TabContentResult =
  | { status: "success"; article: ArticleState }
  | { status: "tab_not_found" }
  | { status: "fetch_failed"; error: string; tab: BrowserTab };
