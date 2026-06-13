import { Icon } from "@raycast/api";

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
  detailMarkdown?: string;
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
  all: "全部",
  doc: "云文档",
  message: "消息",
  chat: "群组",
  contact: "联系人",
  wiki: "知识库",
  sheet: "表格",
};

export const typeLabels: Record<LarkSearchType, string> = {
  doc: "文档",
  message: "消息",
  chat: "群",
  contact: "人",
  wiki: "知识库",
  sheet: "表格",
};

export const typeIcons: Record<LarkSearchType, Icon> = {
  doc: Icon.Document,
  message: Icon.Message,
  chat: Icon.TwoPeople,
  contact: Icon.Person,
  wiki: Icon.Book,
  sheet: Icon.BarChart,
};
