import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<Preferences>();
<<<<<<< HEAD

export const plexBaseUrl = preferences.plexBaseUrl;
=======
const plexBaseUrl = preferences.plexBaseUrl;

>>>>>>> contributions/merge-1719123929787840000
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
