import { Cache, Color, environment, type Image } from "@raycast/api";
import type { ResourceConfig } from "./types";

export const API_HOST = "https://beard.town";
export const UUID = "D5A19F84-636A-476D-8C63-94A7C212E3F7";
export const DEFAULT_PAGE_SIZE = 50;
export const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000;
export const ASSETS_DIR = environment.assetsPath;

export const CHALLENGES_ACTION_ICON: Image.ImageLike = {
  source: `${ASSETS_DIR}/challenges.svg`,
  tintColor: Color.SecondaryText,
};
export const DETAILS_ACTION_ICON: Image.ImageLike = {
  source: `${ASSETS_DIR}/details.svg`,
  tintColor: Color.SecondaryText,
};
export const GLOBE_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/globe.svg`, tintColor: Color.SecondaryText };
export const MAP_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/map.svg`, tintColor: Color.SecondaryText };
export const PLAY_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/play.svg`, tintColor: Color.SecondaryText };
export const SUCCEEDED_STATUS_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/succeeded.svg`, tintColor: Color.Green };
export const FAILED_STATUS_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/failed.svg`, tintColor: Color.Red };

export const responseCache = new Cache({ namespace: "beardtown-api" });

export const RESOURCE_CONFIG: ResourceConfig = {
  challenges: {
    title: "Challenges",
    path: "/api/v1/challenges.json",
    icon: { source: `${ASSETS_DIR}/challenges.svg`, tintColor: Color.SecondaryText },
  },
  highlights: {
    title: "Highlights",
    path: "/api/v1/highlights.json",
    icon: { source: `${ASSETS_DIR}/highlights.svg`, tintColor: Color.SecondaryText },
  },
  consumed: {
    title: "Consumed",
    path: "/api/v1/consumed.json",
    icon: { source: `${ASSETS_DIR}/consumed.svg`, tintColor: Color.SecondaryText },
  },
  prizes: {
    title: "Prizes",
    path: "/api/v1/prizes.json",
    icon: { source: `${ASSETS_DIR}/prizes.svg`, tintColor: Color.SecondaryText },
  },
  guests: {
    title: "Guests",
    path: "/api/v1/guests.json",
    icon: { source: `${ASSETS_DIR}/guests.svg`, tintColor: Color.SecondaryText },
  },
  series: {
    title: "Series",
    path: "/api/v1/series.json",
    icon: { source: `${ASSETS_DIR}/series.svg`, tintColor: Color.SecondaryText },
  },
  tshirts: {
    title: "T-Shirts",
    path: "/api/v1/tshirts.json",
    icon: { source: `${ASSETS_DIR}/tshirts.svg`, tintColor: Color.SecondaryText },
  },
};
