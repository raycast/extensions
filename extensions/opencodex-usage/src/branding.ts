import { Color, Icon, type Image } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { PROVIDER_LOGO_FILES } from "./provider-logos";
import { usageColor } from "./quota";

/**
 * Hand-picked marks that win over the generated svgl set, plus aliases for names that
 * appear in usage payloads but are not opencodex provider ids.
 */
const OVERRIDES: Record<string, Image.ImageLike> = {
  anthropic: { source: "claude.svg" },
  claude: { source: "claude.svg" },
  openai: { source: { light: "codex-light.svg", dark: "codex-dark.svg" } },
  codex: { source: { light: "codex-light.svg", dark: "codex-dark.svg" } },
};

/**
 * Vendor logo for a provider id. Monochrome marks ship light/dark variants so Raycast
 * can pick the right one per appearance. Unknown providers return undefined so callers
 * can fall back to a generic icon.
 */
export function providerLogo(provider: string): Image.ImageLike | undefined {
  const key = provider.trim().toLowerCase();
  const override = OVERRIDES[key];
  if (override) return override;

  const generated = PROVIDER_LOGO_FILES[key];
  if (generated) return { source: generated };

  // Providers are often suffixed variants of a base vendor, e.g. "kimi-code" or "google-vertex".
  const base = key.split(/[-_/]/)[0];
  const fallback = OVERRIDES[base] ?? (PROVIDER_LOGO_FILES[base] ? { source: PROVIDER_LOGO_FILES[base] } : undefined);
  return fallback;
}

/**
 * Ring showing how much of the window is consumed, tinted by pressure.
 * Falls back to a plain logo/dot when no quota is known.
 */
export function usageRing(percent: number): Image.ImageLike {
  if (!Number.isFinite(percent) || percent < 0) {
    return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
  const clamped = Math.max(0, Math.min(100, percent));
  return getProgressIcon(clamped / 100, usageColor(clamped), { background: Color.SecondaryText });
}

/**
 * Menu bar variant of {@link usageRing}.
 *
 * The menu bar only resolves bundled icons and asset filenames — inline `data:` SVG
 * URIs silently render as nothing, and `getProgressIcon` produces exactly that. macOS
 * also draws the result as a monochrome template image, so tint colours are discarded.
 * Raycast's circle-progress glyphs are built for this context, at the cost of
 * quantising to the nearest quarter.
 */
export function menuBarUsageRing(percent: number): Image.ImageLike {
  if (!Number.isFinite(percent) || percent < 0) return Icon.CircleProgress;
  const clamped = Math.max(0, Math.min(100, percent));
  if (clamped < 12.5) return Icon.CircleProgress;
  if (clamped < 37.5) return Icon.CircleProgress25;
  if (clamped < 62.5) return Icon.CircleProgress50;
  if (clamped < 87.5) return Icon.CircleProgress75;
  return Icon.CircleProgress100;
}
