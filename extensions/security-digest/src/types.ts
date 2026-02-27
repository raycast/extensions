export type Category = "vulnerability" | "intelligence" | "news";

export interface SecurityItem {
  title: string;
  link: string;
  content: string;
  pubDate: Date;
  source?: string;
  sourceUrl?: string;
  category: Category;
  cveId?: string;
  sources?: string[];
  aiSummary?: string;
}

export interface OPMLFeed {
  title: string;
  url: string;
  category?: string;
  htmlUrl?: string;
}

export interface Preferences {
  opmlUrl?: string;
  hoursBack: number;
  maxItems: number;
  maxFeeds: number;
  aiProvider?: "openai" | "claude" | "gemini" | "none";
  openaiApiKey?: string;
  claudeApiKey?: string;
  geminiApiKey?: string;
}

export interface DigestSection {
  title: string;
  items: SecurityItem[];
}
