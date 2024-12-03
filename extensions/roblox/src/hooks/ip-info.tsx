interface GeoLocationResponse {
  status: string;
  country: string;
  countryCode: string;
  region: string;
  regionName: string;
  city: string;
  zip: string;
  lat: number;
  lon: number;
  timezone: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

import { useFetch } from "@raycast/utils";

export function useIPInfo(ip?: string | null) {
  const { data, isLoading } = useFetch<GeoLocationResponse>(`http://ip-api.com/json/${ip}`, {
    execute: !!ip,
  });

  return { data, isLoading };
}
