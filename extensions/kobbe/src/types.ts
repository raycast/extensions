export type TimeRange = "today" | "24h" | "7d" | "30d" | "all";

export type KobbeSite = {
  id: string;
  name: string;
  domain: string | null;
  createdAt: number;
};

export type KobbeRevenue = {
  orders: number;
  amount: number;
  attributedAmount: number;
  currency: string | null;
  multipleCurrencies: boolean;
  attributedPercent: string;
};

export type KobbeTopPage = {
  path: string;
  visitors: number;
  views: number;
};

export type KobbeSource = {
  source: string;
  visitors: number;
  views: number;
};

export type KobbeOverview = {
  range: string;
  kpis: {
    visitors: string;
    visits: string;
    views: string;
    bounceRate: string;
    sessionTime: string;
    online: string;
  };
  topPages: KobbeTopPage[];
  sources: KobbeSource[];
  revenue: KobbeRevenue;
};

export type SitesResponse = {
  ok: true;
  sites: KobbeSite[];
};

export type OverviewResponse = {
  ok: true;
  site: KobbeSite;
  overview: KobbeOverview;
};

export type TopPagesResponse = {
  ok: true;
  site: KobbeSite;
  range: string;
  pages: KobbeTopPage[];
};

export type RevenueResponse = {
  ok: true;
  site: KobbeSite;
  range: string;
  revenue: KobbeRevenue;
};

export type SourcesResponse = {
  ok: true;
  site: KobbeSite;
  range: string;
  sources: KobbeSource[];
};

export type KobbeSetupHealth = {
  trackerInstalled: boolean;
  pageviewsAllTime: number;
  revenueConfigured?: boolean;
  revenueOrdersAllTime?: number;
  revenueSources?: Array<{
    provider: string;
    enabled: boolean;
    webhookSecretConfigured: boolean;
  }>;
};

export type SetupHealthResponse = {
  ok: true;
  site: KobbeSite;
  health: KobbeSetupHealth;
};

export type KobbeLiveSite = {
  site: KobbeSite;
  /** Visitors online now, or null when the count for this site could not be loaded. */
  online: number | null;
};

export type LiveResponse = {
  ok: true;
  sites: Array<{ site: KobbeSite; online: number }>;
};
