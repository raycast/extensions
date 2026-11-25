export type Website = {
  id?: string;
  domain?: string;
  timezone?: string;
  currency?: string;
  logo?: string | null;
};

export type WebsiteSelector = {
  websiteId?: string;
  domain?: string;
};

export type ReportWindow = {
  startAt: string;
  endAt: string;
  timezone: string;
};

export type Overview = {
  visitors?: number;
  sessions?: number;
  bounceRate?: number;
  avgSessionDuration?: number;
  revenue?: number;
  revenuePerVisitor?: number;
  conversionRate?: number;
  currency?: string;
};

export type BreakdownRow = {
  value: string;
  visitors: number;
  percentage?: number;
  countryCode?: string;
  iconUrl?: string | null;
};

export type BreakdownKind = "pages" | "referrers" | "countries";

export type IssueStatus = "open" | "in_progress" | "resolved" | "suspended";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type Issue = {
  id: string;
  websiteId: string;
  title: string;
  description?: string;
  severity: IssueSeverity;
  status: IssueStatus;
  sessionsCount?: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
  stepsToReplicate?: string[];
  externalTicketKey?: string | null;
  externalTicketUrl?: string | null;
};

export type Pagination = {
  limit: number;
  offset: number;
  total: number;
};

export type ListIssuesQuery = WebsiteSelector & {
  search?: string;
  limit: number;
  offset: number;
};
