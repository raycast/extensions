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

export type Category =
  | "ai-ml"
  | "data-analytics"
  | "developer-tools"
  | "infrastructure-cloud"
  | "integration-automation"
  | "security-identity"
  | "other";

// The API returns an array of websites directly
export type WebsiteData = Website[];

export type ActionType = "view_llms" | "copy_llms" | "view_llms_full" | "copy_llms_full";

export interface HistoryEntry {
  website: Website;
  timestamp: number;
  action: ActionType;
}

export interface Preferences {
  primaryAction: ActionType;
  historySize: string;
  cacheDuration: string;
  historyRetention: string;
  defaultCategory: Category | "all";
  showDescriptions: boolean;
  githubToken?: string;
}
