export type DateRangeKey = "7d" | "30d" | "90d" | "all";

export type Preferences = {
  apiKey: string;
  websiteId?: string;
  defaultDateRange: DateRangeKey;
  timezone?: string;
};

export type ApiEnvelope<T> = {
  status: "success";
  data: T;
  pagination?: {
    limit?: number;
    offset?: number;
    total?: number;
    hasMore?: boolean;
  };
};

export type ApiErrorEnvelope = {
  status?: string;
  error?: string;
  message?: string;
  details?: unknown;
};

export type Metadata = {
  domain?: string | null;
  timezone?: string | null;
  name?: string | null;
  logo?: string | null;
  kpi?: string | null;
  currency?: string | null;
};

export type Overview = {
  visitors?: number;
  sessions?: number;
  bounce_rate?: number;
  avg_session_duration?: number;
  currency?: string;
  revenue?: number;
  payments?: number;
  revenue_per_visitor?: number;
  conversion_rate?: number;
};

export type Realtime = {
  visitors?: number;
};

export type BreakdownKind = "pages" | "referrers" | "countries" | "devices" | "campaigns" | "goals";

export type BreakdownRow = {
  hostname?: string;
  path?: string;
  referrer?: string;
  country?: string;
  image?: string;
  device?: string;
  campaign?: Partial<
    Record<
      "utm_source" | "utm_medium" | "utm_campaign" | "utm_term" | "utm_content" | "ref" | "source" | "via",
      string | null
    >
  >;
  goal?: string;
  visitors?: number;
  completions?: number;
  revenue?: number;
  payments?: number;
};

export type VisitorListRow = {
  visitorId: string;
  lastSeenAt?: string | null;
  currentUrl?: string | null;
  identity?: {
    country?: string | null;
    region?: string | null;
    city?: string | null;
    browser?: string | null;
    os?: string | null;
    device?: string | null;
  };
  acquisition?: Record<string, string | null | undefined>;
};

export type VisitorDetail = {
  visitorId: string;
  identity?: {
    country?: string | null;
    countryCode?: string | null;
    region?: string | null;
    city?: string | null;
    params?: Record<string, string | null | undefined>;
    browser?: {
      name?: string | null;
      version?: string | null;
    };
    os?: {
      name?: string | null;
      version?: string | null;
    };
    device?: {
      type?: string | null;
      vendor?: string | null;
      model?: string | null;
    };
    viewport?: {
      width?: number | null;
      height?: number | null;
    };
  };
  activity?: {
    visitCount?: number;
    pageViewCount?: number;
    firstVisitAt?: string | null;
    lastVisitAt?: string | null;
    currentUrl?: string | null;
    completedGoals?: Array<{
      name?: string;
      origin?: string;
      type?: string;
      timestamp?: string;
    }>;
    visitedPages?: Array<{
      url?: string;
      timestamp?: string;
    }>;
  };
  profile?: {
    userId?: string;
    metadata?: Record<string, unknown>;
    identifiedAt?: string;
  } | null;
  prediction?: {
    score?: number;
    conversionRate?: number;
    expectedValue?: number;
    confidence?: number;
  } | null;
};
