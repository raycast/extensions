import { normalizeApiBaseUrl } from "./townspot";

export type EventDetails = {
  uuid: string;
  title: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  description?: string | null;
  venueDescription?: string | null;
  locationName?: string | null;
  locationAddress?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  startTimeLocal?: string | null;
  endTimeLocal?: string | null;
  timezone?: string | null;
  resolvedTimezone?: string | null;
  categories?: string[] | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  mainImgUrl?: string | null;
  priceInfo?: string | null;
  bookingRequired?: boolean | null;
  isFree?: boolean | null;
  lat?: number | null;
  lng?: number | null;
  zoneName?: string | null;
  spottedBy?: {
    name?: string | null;
    org?: string | null;
    displayPref?: string | null;
    subscriberId?: number | null;
    avatarUrl?: string | null;
    spottedAt?: string | null;
    isAreaAdmin?: boolean | null;
  } | null;
};

const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

const withLocalFallback = (url: string): string[] => {
  const base = url.replace(/\/$/, "");
  const fallback = base.replace("localhost", "127.0.0.1");
  return [...new Set([base, fallback])];
};

const endpointCandidates = (base: string, eventUuid: string): string[] => {
  const encoded = encodeURIComponent(eventUuid);
  const direct = `${base}/events/get?eventUuid=${encoded}`;
  if (base.endsWith("/api")) return [direct];
  return [direct, `${base}/api/events/get?eventUuid=${encoded}`];
};

export const fetchEventDetails = async (
  apiBaseUrl: string,
  eventUuid: string,
): Promise<EventDetails> => {
  const normalizedBase = normalizeApiBaseUrl(apiBaseUrl);
  const candidates = withLocalFallback(normalizedBase);

  let response: Response | undefined;
  let lastError: string | undefined;

  for (const base of candidates) {
    for (const endpoint of endpointCandidates(base, eventUuid)) {
      try {
        const current = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });
        if (!current.ok) {
          lastError = `status ${current.status}`;
          continue;
        }
        response = current;
        break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "network error";
      }
    }
    if (response) {
      break;
    }
  }

  if (!response) {
    throw new Error(`Unable to load event details (${lastError || "unknown error"})`);
  }

  const payload = (await response.json()) as EventDetails;
  return {
    ...payload,
    lat: toNumber(payload.lat),
    lng: toNumber(payload.lng),
  };
};

export const googleMapsUrl = (
  lat: number,
  lng: number,
  label?: string,
): string => {
  const q = label ? `${lat},${lng} (${label})` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
};

export const appleMapsUrl = (
  lat: number,
  lng: number,
  label?: string,
): string => {
  const q = label || `${lat},${lng}`;
  return `https://maps.apple.com/?ll=${encodeURIComponent(`${lat},${lng}`)}&q=${encodeURIComponent(q)}`;
};
