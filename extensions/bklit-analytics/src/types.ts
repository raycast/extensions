export interface TopCountryData {
  country: string;
  countryCode: string;
  views: number;
  uniqueVisitors: number;
}

export interface ApiResponse {
  success: boolean;
  data?: TopCountryData[];
  totalPageviews?: number;
  error?: string;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export interface DeviceUsageData {
  mobile: {
    views: number;
    percentage: number;
  };
  desktop: {
    views: number;
    percentage: number;
  };
  total: number;
}

export interface DeviceUsageApiResponse {
  success: boolean;
  data?: DeviceUsageData;
  error?: string;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export interface ReferrerData {
  referrer: string;
  views: number;
  percentage: number;
}

export interface ReferrerApiResponse {
  success: boolean;
  data?: ReferrerData[];
  totalPageviews?: number;
  error?: string;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export interface PageData {
  path: string;
  views: number;
}

export interface PageApiResponse {
  success: boolean;
  data?: PageData[];
  totalPageviews?: number;
  error?: string;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export interface BrowserData {
  browser: string;
  views: number;
  percentage: number;
}

export interface BrowserUsageApiResponse {
  success: boolean;
  data?: BrowserData[];
  totalPageviews?: number;
  error?: string;
  period?: {
    startDate: string;
    endDate: string;
  };
}

export type AnalyticsSection = "countries" | "device" | "referrers" | "pages";
