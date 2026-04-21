export interface Website {
  name: string;
  domain: string; // includes https:// prefix
  description: string;
  llmsTxtUrl: string;
  llmsFullTxtUrl?: string;
  category: Category;
  favicon?: string;
  url: string;
}

export type Category = Exclude<Preferences["defaultCategory"], "all">;

// The API returns an array of websites directly
export type WebsiteData = Website[];

export type ActionType = Preferences["primaryAction"];

export interface HistoryEntry {
  website: Website;
  timestamp: number;
  action: ActionType;
}
