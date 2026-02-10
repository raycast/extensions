import { LocationInfo } from "../types";
import { fetchJson } from "./http";

type GeocodeResponse = {
  results?: Array<{
    latitude: number;
    longitude: number;
    name: string;
    country?: string;
    country_code?: string;
    admin1?: string;
  }>;
};

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export async function fetchManualLocation(query: string): Promise<LocationInfo> {
  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", query);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const result = await fetchJson<GeocodeResponse>(url.toString());
  const best = result.results?.[0];
  if (!best) {
    throw new Error("No results for the provided location.");
  }

  const label = [best.name, best.admin1, best.country].filter(Boolean).join(", ") || query;
  return {
    latitude: best.latitude,
    longitude: best.longitude,
    label,
    source: "manual",
    countryCode: best.country_code ?? null,
  };
}
