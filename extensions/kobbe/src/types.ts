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
