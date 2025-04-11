import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface SearchResult {
  year: string;
  subtype: string;
  title: string;
  subtitle: string;
  link: string;
}

export interface ApiResponse {
  success: boolean;
  error?: string;
  format?: string;
  data?: SearchResult[];
}

export enum Source {
  Douban = "douban",
  Bangumi = "bangumi",
}

const getHost = () => {
  const preferences = getPreferenceValues<Preferences>();

  const { host } = preferences;

  return host;
};

export const useDetail = (url: string) => {
  const baseParams: Record<string, string> = {};

  const params = new URLSearchParams({
    ...baseParams,
    url,
  });

  return useFetch<ApiResponse>(`${getHost()}/api/gen?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });
};

export const useSearch = (query: string, source: Source = Source.Douban) => {
  const baseParams: Record<string, string> = {};

  const params = new URLSearchParams({
    ...baseParams,
    search: query,
    source,
  });

  return useFetch<ApiResponse>(`${getHost()}/api/gen?${params.toString()}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
  });
};
