import { getPreferenceValues } from "@raycast/api";
import { OverseerrRequest } from "./types";

type Preferences = {
  OVERSEERR_API_ADDRESS: string;
  OVERSEERR_API_KEY: string;
  TMDB_KEY: string;
  TMDB_LANGUAGE?: string;
  SONARR_API_ADDRESS: string;
  SONARR_API_KEY: string;
};

const raw = getPreferenceValues<Preferences>();

export const preferences = {
  OVERSEERR_API_ADDRESS: raw.OVERSEERR_API_ADDRESS.replace(/\/+$/, ""),
  OVERSEERR_API_KEY: raw.OVERSEERR_API_KEY,
  TMDB_KEY: raw.TMDB_KEY,
  TMDB_LANGUAGE: raw.TMDB_LANGUAGE?.trim() || "en",
  SONARR_API_ADDRESS: raw.SONARR_API_ADDRESS.replace(/\/+$/, ""),
  SONARR_API_KEY: raw.SONARR_API_KEY,
};

export const OVERSEERR_API_REQUEST = `${preferences.OVERSEERR_API_ADDRESS}/api/v1/request`;
export const OVERSEERR_API_SETTINGS = `${preferences.OVERSEERR_API_ADDRESS}/api/v1/settings`;
export const SONARR_API_PROFILES = `${preferences.SONARR_API_ADDRESS}/api/v3/qualityprofile`;

export function getCombinedStatus(r: OverseerrRequest): string {
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
