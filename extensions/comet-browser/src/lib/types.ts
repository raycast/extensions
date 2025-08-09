export interface CometTab {
  id: string;
  url: string;
  title: string;
  loading: boolean;
  windowId?: string;
  isActive?: boolean;
}

export interface CometHistoryEntry {
  id: number;
  url: string;
  title: string;
  visit_count: number;
  last_visit_time: number;
  typed_count: number;
}

export interface CometWindow {
  id: string;
  name: string;
  bounds: string;
  visible: boolean;
  minimized: boolean;
  activeTabIndex: number;
  tabs: CometTab[];
}

export interface SearchResult {
  type: "tab" | "history";
  score?: number;
  data: CometTab | CometHistoryEntry;
}

export interface BrowserIntegration {
  getTabs(): Promise<CometTab[]>;
  getHistory(): Promise<CometHistoryEntry[]>;
  switchToTab(tabId: string): Promise<void>;
  openUrl(url: string): Promise<void>;
  openInNewTab(url: string): Promise<void>;
}

export type IntegrationMethod = "applescript" | "database" | "basic";

export interface CometError extends Error {
  code?: string;
  recoverable?: boolean;
}
