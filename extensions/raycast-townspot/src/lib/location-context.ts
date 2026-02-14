import { normalizeApiBaseUrl, sanitizeTownSlug } from "./townspot";

const FALLBACK_TOWN_SLUG = "kentish-town";

export type TownContext = {
  slug: string;
  name: string;
  source: "argument" | "preference" | "detected" | "fallback";
};

type ResolveTownContextInput = {
  argumentTownSlug?: string;
  defaultTownSlug?: string;
  apiBaseUrl: string;
};

type IpLocation = {
  lat: number;
  lng: number;
  countryCode?: string;
};

type ZoneMatchResponse = {
  zone?: {
    slug?: string;
    name?: string;
  } | null;
};

type IpApiResponse = {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lon?: number | string;
  country_code?: string;
};

type ZoneListRecord = {
  slug?: string;
  name?: string;
  lat?: number | string | null;
  lng?: number | string | null;
  country_code?: string;
  countryCode?: string;
  active?: boolean;
  hidden?: boolean;
};

const toTownName = (slug: string): string =>
  slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const withTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const fetchIpLocation = async (): Promise<IpLocation | null> => {
  try {
    const response = await withTimeout("https://ipapi.co/json/", 2200);
    if (!response.ok) return null;

    const payload = (await response.json()) as IpApiResponse;
    const lat = toNumber(payload.latitude ?? payload.lat);
    const lng = toNumber(payload.longitude ?? payload.lon);
    const countryCode = String(payload.country_code || "")
      .trim()
      .toLowerCase();

    if (lat === null || lng === null) return null;
    return {
      lat,
      lng,
      countryCode: countryCode || undefined,
    };
  } catch {
    return null;
  }
};

const fetchZoneFromCoordinates = async (
  apiBaseUrl: string,
  lat: number,
  lng: number,
): Promise<{ slug: string; name: string } | null> => {
  try {
    const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl).replace(/\/$/, "");
    const endpoint = `${normalizedBaseUrl}/places/match-zone?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`;
    const response = await withTimeout(endpoint, 1600);
    if (!response.ok) return null;

    const payload = (await response.json()) as ZoneMatchResponse;
    const slug = sanitizeTownSlug(payload?.zone?.slug || "");
    if (!slug) return null;

    const name = String(payload?.zone?.name || "").trim() || toTownName(slug);
    return { slug, name };
  } catch {
    return null;
  }
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

const haversineKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const fetchJsonWithFallback = async (
  urls: string[],
): Promise<ZoneListRecord[] | null> => {
  for (const url of urls) {
    try {
      const response = await withTimeout(url, 2200);
      if (!response.ok) continue;
      const payload = (await response.json()) as ZoneListRecord[];
      if (Array.isArray(payload)) return payload;
    } catch {
      // try next endpoint
    }
  }
  return null;
};

const findNearestZone = (
  zones: ZoneListRecord[],
  ipLocation: IpLocation,
): { slug: string; name: string } | null => {
  const preferredCountry = ipLocation.countryCode;

  const candidates = zones.filter((zone) => {
    if (zone.hidden === true || zone.active === false) return false;
    const zoneSlug = sanitizeTownSlug(zone.slug || "");
    const zoneName = String(zone.name || "").trim();
    const zoneLat = toNumber(zone.lat);
    const zoneLng = toNumber(zone.lng);
    if (!zoneSlug || !zoneName || zoneLat === null || zoneLng === null) return false;

    if (!preferredCountry) return true;
    const zoneCountry = String(zone.country_code || zone.countryCode || "")
      .trim()
      .toLowerCase();
    return !zoneCountry || zoneCountry === preferredCountry;
  });

  let best: { slug: string; name: string; distanceKm: number } | null = null;

  for (const zone of candidates) {
    const zoneLat = toNumber(zone.lat);
    const zoneLng = toNumber(zone.lng);
    if (zoneLat === null || zoneLng === null) continue;
    const distanceKm = haversineKm(ipLocation.lat, ipLocation.lng, zoneLat, zoneLng);
    if (!best || distanceKm < best.distanceKm) {
      best = {
        slug: sanitizeTownSlug(zone.slug || ""),
        name: String(zone.name || "").trim(),
        distanceKm,
      };
    }
  }

  if (!best || !best.slug || !best.name) return null;
  return { slug: best.slug, name: best.name };
};

const fetchNearestZoneByDistance = async (
  apiBaseUrl: string,
  ipLocation: IpLocation,
): Promise<{ slug: string; name: string } | null> => {
  const normalizedBaseUrl = normalizeApiBaseUrl(apiBaseUrl).replace(/\/$/, "");
  const payload = await fetchJsonWithFallback([
    `${normalizedBaseUrl}/locations/list?includeHidden=true`,
    `${normalizedBaseUrl}/locations/list`,
    `${normalizedBaseUrl}/list`,
  ]);

  if (!payload) return null;
  return findNearestZone(payload, ipLocation);
};

export const resolveTownContext = async (
  input: ResolveTownContextInput,
): Promise<TownContext> => {
  const fromArgument = sanitizeTownSlug(input.argumentTownSlug || "");
  if (fromArgument) {
    return {
      slug: fromArgument,
      name: toTownName(fromArgument),
      source: "argument",
    };
  }

  const fromPreference = sanitizeTownSlug(input.defaultTownSlug || "");
  if (fromPreference) {
    return {
      slug: fromPreference,
      name: toTownName(fromPreference),
      source: "preference",
    };
  }

  const ipLocation = await fetchIpLocation();
  if (ipLocation) {
    const matchedZone = await fetchZoneFromCoordinates(
      input.apiBaseUrl,
      ipLocation.lat,
      ipLocation.lng,
    );
    if (matchedZone) {
      return {
        slug: matchedZone.slug,
        name: matchedZone.name,
        source: "detected",
      };
    }

    const nearestZone = await fetchNearestZoneByDistance(
      input.apiBaseUrl,
      ipLocation,
    );
    if (nearestZone) {
      return {
        slug: nearestZone.slug,
        name: nearestZone.name,
        source: "detected",
      };
    }
  }

  return {
    slug: FALLBACK_TOWN_SLUG,
    name: toTownName(FALLBACK_TOWN_SLUG),
    source: "fallback",
  };
};
