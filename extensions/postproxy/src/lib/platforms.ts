import { Icon, type Image } from "@raycast/api";

/**
 * Platform display helpers.
 *
 * Network logos are bundled brand SVGs under assets/platforms/. Marks whose
 * brand color is near-black (X, TikTok, Threads) ship a light/dark pair so they
 * stay visible in both Raycast themes.
 */

const EMOJI: Record<string, string> = {
  twitter: "🐦",
  x: "🐦",
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  linkedin: "💼",
  youtube: "📺",
  threads: "🧵",
  pinterest: "📌",
  bluesky: "🦋",
  telegram: "✈️",
  google_business: "🏢",
};

const LABEL: Record<string, string> = {
  x: "X",
  twitter: "X",
  google_business: "Google Business",
};

/** platform → bundled asset base name in assets/platforms/. */
const ASSET: Record<string, string> = {
  twitter: "x",
  x: "x",
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  linkedin: "linkedin",
  youtube: "youtube",
  threads: "threads",
  pinterest: "pinterest",
  bluesky: "bluesky",
  telegram: "telegram",
  google_business: "google-business",
};

/** Assets that ship a separate @dark variant (near-black brand marks). */
const HAS_DARK = new Set(["x", "tiktok", "threads"]);

export function platformEmoji(platform: string | undefined): string {
  return EMOJI[(platform ?? "").toLowerCase()] ?? "🌐";
}

export function platformLabel(platform: string | undefined): string {
  const key = (platform ?? "").toLowerCase();
  if (LABEL[key]) return LABEL[key];
  return key ? key.charAt(0).toUpperCase() + key.slice(1) : "Unknown";
}

/** Network logo as a Raycast image source (falls back to a generic globe). */
export function platformIcon(platform: string | undefined): Image.ImageLike {
  const asset = ASSET[(platform ?? "").toLowerCase()];
  if (!asset) return Icon.Globe;
  if (HAS_DARK.has(asset)) {
    return { source: { light: `platforms/${asset}.svg`, dark: `platforms/${asset}@dark.svg` } };
  }
  return { source: `platforms/${asset}.svg` };
}

/** Platforms whose stats require a placement_id (page / organization / channel). */
export function needsPlacement(platform: string | undefined): boolean {
  return ["facebook", "linkedin", "telegram"].includes((platform ?? "").toLowerCase());
}
