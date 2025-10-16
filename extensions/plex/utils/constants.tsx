import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();

export const plexBaseUrl = preferences.plexBaseUrl;
export const plex_token = preferences.plexToken;

export const ENDPOINTS = {
  librarySections: `${plexBaseUrl}/library/sections/`,
  activeSessions: `${plexBaseUrl}/status/sessions`,
};

export const SECTION_ICONS = {
  movie: "🎬",
  show: "📺",
  music: "🎵",
  photo: "📷",
  other: "📹",
};
