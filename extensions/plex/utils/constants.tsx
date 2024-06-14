import { ActionPanel, getPreferenceValues } from "@raycast/api";
import React from "react";

const plexBaseUrl = getPreferenceValues().plexBaseUrl;

export const plex_token = getPreferenceValues().plexToken;

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
