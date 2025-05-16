import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  OVERSEERR_API_ADDRESS: string;
  OVERSEERR_API_KEY: string;
  TMDB_KEY: string;
  TMDB_LANGUAGE?: string;
};

const raw = getPreferenceValues<Preferences>();

// sanitize address: remove trailing slash
const baseUrl = raw.OVERSEERR_API_ADDRESS.replace(/\/+$/, "");

export const preferences = {
  OVERSEERR_API_ADDRESS: baseUrl,
  OVERSEERR_API_KEY: raw.OVERSEERR_API_KEY,
  TMDB_KEY: raw.TMDB_KEY,
  TMDB_LANGUAGE: raw.TMDB_LANGUAGE?.trim() || "en",
};

// API endpoints constructed from base
export const OVERSEERR_API_REQUEST = `${baseUrl}/api/v1/request`;
export const OVERSEERR_API_SETTINGS = `${baseUrl}/api/v1/settings`;

/**
 * Return combined status based on request and media status.
 */
export function getCombinedStatus(r: any): string {
  const reqStatus = r.status;
  const mediaStatus = r.media?.status;

  if (reqStatus === 2) {
    switch (mediaStatus) {
      case 5:
        return "✅ Approved - Available";
      case 4:
        return "🟡 Approved - Partially Available";
      case 3:
        return "⏳ Approved - Processing";
      case 0:
        return "❌ Approved - Failed";
      default:
        return "❔ Approved - Unknown";
    }
  }

  if (reqStatus === 1) return "🕓 Awaiting";
  if (reqStatus === 3) return "🚫 Declined";

  return "ℹ️ Status Unknown";
}
