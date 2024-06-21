import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
const plexBaseUrl = preferences.plexBaseUrl;

export const plex_token = preferences.plexToken;

export const ENDPOINTS = {
  librarySections: `${plexBaseUrl}/library/sections/`,
};

export const SECTION_ICONS = {
  movie: "🎬",
  show: "📺",
  music: "🎵",
  photo: "📷",
  other: "📹",
};
