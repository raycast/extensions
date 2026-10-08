export interface ApiSuccessResponse<T> {
  status: "success";
  data: T;
}

export interface ApiErrorResponse {
  status: "error";
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface OverviewData {
  visitors: number;
  sessions: number;
  bounce_rate: number;
  avg_session_duration: number;
  currency: string;
  revenue: number;
  revenue_per_visitor: number;
  conversion_rate: number;
}

export interface MetadataData {
  domain: string;
  timezone: string;
  name: string;
  logo: string;
  kpiColorScheme: string;
  kpi: string;
  currency: string;
}

export interface RealtimeData {
  visitors: number;
}

export interface RealtimeMapVisitor {
  visitorId: string;
  location: {
    city?: string;
    region?: string;
    countryCode?: string;
  };
  system: {
    browser?: { name?: string };
    os?: { name?: string };
    device?: { type?: string };
  };
  currentUrl?: string;
  referrer?: string | null;
  sessionStartTime?: string;
  visitCount?: number;
  params?: {
    ref?: string | null;
    source?: string | null;
    via?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
  };
  latitude?: number;
  longitude?: number;
  isCustomer?: boolean;
  customerName?: string | null;
  customerEmail?: string | null;
  profileData?: {
    displayName?: string | null;
    userId?: string | null;
    hasProfile?: boolean;
  };
  conversionLikelihood?: {
    score?: number;
    confidence?: number;
  };
}

export interface RealtimeMapEvent {
  _id: string;
  type: string;
  visitorId: string;
  timestamp: string;
  path?: string;
  countryCode?: string;
  referrer?: string | null;
  customerName?: string | null;
  amount?: number | null;
  displayName?: string | null;
}

export interface RealtimeMapPayment {
  amount: number;
  currency: string;
  timestamp: string;
  customerName?: string | null;
}

export interface RealtimeMapData {
  count: number;
  visitors: RealtimeMapVisitor[];
  recentEvents: RealtimeMapEvent[];
  recentPayments: RealtimeMapPayment[];
  hasConversionPredictions?: boolean;
}

export interface PageData {
  hostname: string;
  path: string;
  visitors: number;
  revenue: number;
}

export interface ReferrerData {
  referrer: string;
  visitors: number;
  revenue: number;
}

export interface CampaignData {
  campaign: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
    utm_term: string;
    utm_content: string;
    ref: string;
    source: string;
    via: string;
  };
  visitors: number;
  revenue: number;
}

export interface CountryData {
  country: string;
  image: string;
  visitors: number;
  revenue: number;
}

export interface RegionData {
  region: string;
  visitors: number;
  revenue: number;
}

export interface CityData {
  city: string;
  visitors: number;
  revenue: number;
}

export interface DateRangeParams {
  [key: string]: string | number | undefined;
  startAt: string;
  endAt: string;
}

export type DateRangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "month"
  | "last-month"
  | "year";
