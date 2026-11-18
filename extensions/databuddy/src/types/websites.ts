export interface Website {
  id: string;
  name: string;
  domain: string;
  isPublic?: boolean;
  createdAt?: string;
  organizationId?: string;
}

export interface Summary {
  pageviews: number;
  unique_visitors: number;
  sessions: number;
  bounce_rate: number;
  median_session_duration: number;
}

export interface PageEntry {
  name: string;
  pageviews: number;
  visitors: number;
  percentage: number;
}

export interface ReferrerEntry {
  name: string;
  domain: string;
  pageviews: number;
  visitors: number;
  percentage: number;
}

export interface CountryEntry {
  name: string;
  country_code: string;
  visitors: number;
  percentage: number;
}

export interface TimeSeriesPoint {
  date: string;
  pageviews: number;
  visitors: number;
  sessions: number;
}
