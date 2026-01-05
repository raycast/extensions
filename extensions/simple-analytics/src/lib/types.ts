export interface Website {
  id: string;
  domain: string;
  apiKey?: string;
  label?: string;
}

export interface PageStats {
  value: string;
  pageviews: number;
  visitors: number;
  seconds_on_page?: number;
}

export interface ReferrerStats {
  value: string;
  pageviews: number;
  visitors: number;
}

export interface HistogramEntry {
  date: string;
  pageviews: number;
  visitors: number;
}

export interface StatsResponse {
  pageviews: number;
  visitors: number;
  seconds_on_page?: number;
  pages?: PageStats[];
  referrers?: ReferrerStats[];
  histogram?: HistogramEntry[];
}

export type TimeRange = "today" | "7d" | "30d";

export interface StatsState {
  website: Website | null;
  timeRange: TimeRange;
  stats: StatsResponse | null;
  isLoading: boolean;
  error: Error | null;
}
