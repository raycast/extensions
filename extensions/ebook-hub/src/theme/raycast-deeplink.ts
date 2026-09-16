import { HUE_TOKENS_VERSION, type HueMood, type HueRole } from "./hue-tokens";

/** Color order expected by `raycast://theme` (ray.so `makeRaycastImportUrl`). */
export const RAYCAST_THEME_SLOTS = [
  "background",
  "backgroundSecondary",
  "text",
  "selection",
  "loader",
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "magenta",
] as const;
export type RaycastThemeSlot = (typeof RAYCAST_THEME_SLOTS)[number];

/** Hue has no yellow or magenta role; those slots reuse the nearest role. See ADR-0001. */
export const SLOT_ROLES: Record<RaycastThemeSlot, HueRole> = {
  background: "surface.canvas",
  backgroundSecondary: "surface.raised",
  text: "text.primary",
  selection: "surface.selected",
  loader: "accent.primary",
  red: "status.error",
  orange: "status.warning",
  yellow: "status.warning",
  green: "status.success",
  blue: "status.info",
  purple: "status.notice",
  magenta: "status.notice",
};

const THEME_AUTHOR = "Hue Theme";
const THEME_AUTHOR_USERNAME = "crafts69guy";

export function buildRaycastThemeDeeplink(mood: HueMood): string {
  const params: [string, string][] = [
    ["author", THEME_AUTHOR],
    ["authorUsername", THEME_AUTHOR_USERNAME],
    ["version", HUE_TOKENS_VERSION],
    ["name", mood.label],
    ["appearance", mood.appearance],
  ];
  const encoded = params.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  const colors = RAYCAST_THEME_SLOTS.map((slot) => encodeURIComponent(mood.roles[SLOT_ROLES[slot]]));
  encoded.push(`colors=${colors.join(",")}`);
  return `raycast://theme?${encoded.join("&")}`;
}
