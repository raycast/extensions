import type { OutputFormat, SearchStyle } from "./types";

export const API_BASE = "https://iconsearch.info";
export const AUTH_API_URL = `${API_BASE}/api`;
export const SEARCH_API_URL = `${API_BASE}/api/extension/icon-search`;
export const PRODUCT = "raycast";

export const SESSION_TOKEN_KEY = "iconsearch.raycast.sessionToken";
export const ACCESS_CACHE_KEY = "iconsearch.raycast.access";
export const RECENT_KEY = "iconsearch.raycast.recentIcons";
export const FAVORITES_KEY = "iconsearch.raycast.favoriteIcons";
export const STARTER_CACHE_KEY = "iconsearch.raycast.starterIcons";
export const STARTER_CACHE_TIME_KEY = "iconsearch.raycast.starterIconsCachedAt";

export const SEARCHABLE_ICON_COUNT = 355_702;
export const PAGE_SIZE = 20;
export const MAX_RECENT_ICONS = 12;
export const MAX_FAVORITE_ICONS = 60;
export const STARTER_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

export const OUTPUT_FORMAT_LABELS: Record<OutputFormat, string> = {
  react: "React",
  svg: "Raw SVG",
  vue: "Vue",
  svelte: "Svelte",
  tailwind: "Tailwind Mask",
  url: "SVG URL",
};

export const SEARCH_STYLE_LABELS: Record<SearchStyle, string> = {
  all: "All Styles",
  stroke: "Stroke / Outline",
  solid: "Solid / Filled",
  duotone: "Duotone",
  twotone: "Two-Tone",
  sharp: "Sharp",
};

export const NAMED_LIBRARIES = [
  ["lucide-icons", "Lucide Icons"],
  ["heroicons", "Heroicons"],
  ["tabler-icons", "Tabler Icons"],
  ["patternfly-icons", "PatternFly Icons"],
  ["phosphor-icons", "Phosphor Icons"],
  ["remix-icon", "Remix Icon"],
  ["feather-icons", "Feather Icons"],
  ["bootstrap-icons", "Bootstrap Icons"],
  ["radix-icons", "Radix Icons"],
  ["iconoir", "Iconoir"],
  ["ionicons", "Ionicons"],
  ["octicons", "Octicons"],
  ["ant-design-icons", "Ant Design Icons"],
  ["devicons", "Devicons"],
  ["teenyicons", "Teenyicons"],
  ["circum-icons", "Circum Icons"],
  ["elusive-icons", "Elusive Icons"],
] as const;

export const ACRONYM_PARTS = new Set([
  "ai",
  "bi",
  "fa",
  "gis",
  "ic",
  "mdi",
  "svg",
  "ui",
]);
