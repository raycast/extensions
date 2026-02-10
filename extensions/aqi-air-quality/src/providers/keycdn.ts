import { LocationInfo } from "../types";
import { fetchJson } from "./http";
import { fetchPublicIp } from "./ipify";

type GeoData = {
  ip?: string;
  city?: string;
  region_name?: string;
  country_name?: string;
  country_code?: string;
  continent_code?: string;
  contitent_code?: string;
  latitude?: number | string;
  longitude?: number | string;
  timezone?: string;
};

type KeyCdnGeoResponse = {
  status?: string;
  data?: {
    geo?: GeoData;
  };
};

const KEYCDN_USER_AGENT = "keycdn-tools:https://github.com/riccardogiorato/aqi-air-quality";
const KEYCDN_GEO_URL = "https://tools.keycdn.com/geo.json";

function buildGeoLabel(geo: GeoData) {
  const parts = [geo.city, geo.region_name, geo.country_name].filter(Boolean);
  if (parts.length > 0) return parts.join(", ");
  return geo.ip ? `IP ${geo.ip}` : "Unknown location";
}

export async function fetchIpLocation(): Promise<LocationInfo> {
  const ip = await fetchPublicIp();
  const url = `${KEYCDN_GEO_URL}?host=${encodeURIComponent(ip)}`;
  const result = await fetchJson<KeyCdnGeoResponse>(url, {
    headers: { "User-Agent": KEYCDN_USER_AGENT },
  });
  const geo = result.data?.geo;
  if (!geo?.latitude || !geo?.longitude) {
    throw new Error("Location lookup failed.");
  }

  const latitude = Number(geo.latitude);
  const longitude = Number(geo.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("Invalid coordinates returned.");
  }

  return {
    latitude,
    longitude,
    label: buildGeoLabel(geo),
    source: "ip",
    countryCode: geo.country_code ?? null,
    continentCode: geo.continent_code ?? geo.contitent_code ?? null,
  };
}
