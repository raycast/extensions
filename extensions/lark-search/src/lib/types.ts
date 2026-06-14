export type LarkSearchType =
  | "doc"
  | "message"
  | "chat"
  | "contact"
  | "wiki"
  | "sheet";
export type SearchScope = "all" | LarkSearchType;
export type SearchScopeFilter = LarkSearchType[];

export type LarkSearchItem = {
  id: string;
  type: LarkSearchType;
  title: string;
  subtitle?: string;
  snippet?: string;
  url?: string;
  updatedAt?: string;
  appTargetKey?: "lark" | "feishu";
  appName?: string;
  applicationName?: string;
  bundleId?: string;
  lastOpenedAt?: string;
  openCount: number;
  rankScore: number;
  source: "recent" | "live";
  raw: unknown;
};

export const scopeTitles: Record<SearchScope, string> = {
  all: "All",
  doc: "Docs",
  message: "Messages",
  chat: "Chats",
  contact: "Contacts",
  wiki: "Wiki",
  sheet: "Sheets",
};
