import axios from "axios";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  siteUuid: string;
  username: string;
  password: string;
}

const preferences = getPreferenceValues<Preferences>();

const apiClient = axios.create({
  baseURL: "https://app.bentonow.com/api/v1",
  auth: {
    username: preferences.username,
    password: preferences.password,
  },
  headers: {
    "User-Agent": `bento-raycast-${preferences.siteUuid}`,
  },
});

export interface Subscriber {
  uuid: string;
  email: string;
  fields: Record<string, string>;
  cached_tag_ids: string[];
  unsubscribed_at: string | null;
  navigation_url: string;
}

export interface Broadcast {
  id: string;
  type: string;
  name: string;
  share_url: string;
  template: {
    subject: string;
    to: string;
    html: string;
  };
  created_at: string;
  sent_final_batch_at: string | null;
  send_at: string | null;
  stats: {
    recipients: number;
    total_opens: number;
    total_clicks: number;
    click_breakdown: Array<{ url: string; count: number }>;
  };
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
  discarded_at: string | null;
}

export interface Field {
  id: string;
  name: string;
  key: string;
  whitelisted: string;
  created_at: string;
}

export interface SiteStats {
  user_count: number;
  subscriber_count: number;
  unsubscribe_count: number;
}

interface ApiResponse<T> {
  data: Array<{ attributes: T }>;
}

export const createSubscriber = async (email: string): Promise<Subscriber> => {
  const response = await apiClient.post<{ data: { attributes: Subscriber } }>("/fetch/subscribers", {
    subscriber: { email },
    site_uuid: preferences.siteUuid,
  });
  return response.data.data.attributes;
};

export async function getBroadcasts(): Promise<Broadcast[]> {
  const response = await apiClient.get<ApiResponse<Broadcast>>("/fetch/broadcasts", {
    params: { site_uuid: preferences.siteUuid },
  });
  return response.data.data.map((item) => item.attributes);
}

export const getTags = async (): Promise<Tag[]> => {
  const response = await apiClient.get<ApiResponse<Tag>>("/fetch/tags", {
    params: { site_uuid: preferences.siteUuid },
  });
  return response.data.data.map((item) => item.attributes);
};

export const getFields = async (): Promise<Field[]> => {
  const response = await apiClient.get<ApiResponse<Field>>("/fetch/fields", {
    params: { site_uuid: preferences.siteUuid },
  });
  return response.data.data.map((item) => item.attributes);
};

export const getSiteStats = async (): Promise<SiteStats> => {
  const response = await apiClient.get<SiteStats>("/stats/site", {
    params: { site_uuid: preferences.siteUuid },
  });
  return response.data;
};

export interface ReportData {
  data: Array<{
    x: string; // Date string
    y: number;
    g: string;
  }>;
  chart_style: string;
  report_type: string;
  report_name: string;
}

export const getReport = async (reportId: string): Promise<ReportData> => {
  console.log("API Client: Fetching report with ID:", reportId);
  const response = await apiClient.get<ReportData>("/stats/report", {
    params: {
      site_uuid: preferences.siteUuid,
      report_id: reportId,
    },
  });
  console.log("API Client: Received response:", JSON.stringify(response.data, null, 2));
  return response.data;
};

export const getMultipleReports = async (reportIds: string[]): Promise<ReportData[]> => {
  const preferences = getPreferenceValues<Preferences>();
  const promises = reportIds.map((reportId) =>
    apiClient.get<ReportData>("/stats/report", {
      params: {
        site_uuid: preferences.siteUuid,
        report_id: reportId,
      },
    })
  );

  const responses = await Promise.all(promises);
  return responses.map((response) => response.data);
};

export interface BlacklistResponse {
  blacklisted: boolean;
  listings: string[];
}

export const checkBlacklist = async (domain?: string, ip?: string): Promise<BlacklistResponse> => {
  const params: Record<string, string> = { site_uuid: preferences.siteUuid };
  if (domain) params.domain = domain;
  if (ip) params.ip = ip;
  const response = await apiClient.get<BlacklistResponse>("/experimental/blacklist.json", {
    params,
  });
  return response.data;
};

export interface ValidationResponse {
  valid: boolean;
  reason?: string;
}

export const validateEmail = async (
  email: string,
  name?: string,
  userAgent?: string,
  ip?: string
): Promise<ValidationResponse> => {
  const params: Record<string, string> = { site_uuid: preferences.siteUuid, email };
  if (name) params.name = name;
  if (userAgent) params.user_agent = userAgent;
  if (ip) params.ip = ip;
  const response = await apiClient.post<ValidationResponse>("/experimental/validation", null, {
    params,
  });
  return response.data;
};

export interface ModerationResponse {
  flagged: boolean;
  categories: string[];
}

export const moderateContent = async (content: string): Promise<ModerationResponse> => {
  const params = { site_uuid: preferences.siteUuid, content };
  const response = await apiClient.post<ModerationResponse>("/experimental/content_moderation", null, { params });
  return response.data;
};

export interface GenderResponse {
  gender: string;
  confidence: number;
}

export const guessGender = async (name: string): Promise<GenderResponse> => {
  const params = { site_uuid: preferences.siteUuid, name };
  const response = await apiClient.post<GenderResponse>("/experimental/gender", null, {
    params,
  });
  return response.data;
};

export interface GeolocationResponse {
  ip: string;
  country_name: string;
  country_code2: string;
  country_code3: string;
  region_name: string;
  city_name: string;
  postal_code: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export const geolocateIp = async (ip: string): Promise<GeolocationResponse> => {
  const params = { site_uuid: preferences.siteUuid, ip };
  const response = await apiClient.get<GeolocationResponse>("/experimental/geolocation", { params });
  return response.data;
};
