import type { YerdSite } from "../yerd/types";

/** Format uptime seconds as "Xh Ym", "Ym Zs", or "Zs". */
export function formatUptime(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

/** Format a port binding for display, showing fallback info when applicable. */
export function formatPort(
  bound: number,
  requested: number,
  fell_back: boolean,
): string {
  if (fell_back) return `${bound} (fallback from ${requested})`;
  return `${bound}`;
}

/** Format a PHP version + patch string, e.g. "8.5 (8.5.8)". */
export function phpLabel(version: string, patch: string): string {
  return `${version} (${patch})`;
}

/**
 * Icon/color tokens for a service state.
 *
 * Plain string tokens (not `Icon`/`Color` values) so this module stays
 * importable outside the Raycast runtime (e.g. under node:test, where
 * `@raycast/api` cannot be loaded). Tokens are exact `@raycast/api` enum
 * member names, so views map them with `Icon[icon]` / `Color[tintColor]`.
 */
export interface ServiceStateVisual {
  icon: "CircleFilled";
  tintColor: "Green" | "SecondaryText" | "Orange";
}

/** Map a service state string to icon/tint tokens for rendering. */
export function serviceStateIcon(state: string): ServiceStateVisual {
  switch (state) {
    case "running":
      return { icon: "CircleFilled", tintColor: "Green" };
    case "stopped":
      return { icon: "CircleFilled", tintColor: "SecondaryText" };
    default:
      return { icon: "CircleFilled", tintColor: "Orange" };
  }
}

/** Human-readable site kind. */
export function siteKindLabel(kind: "parked" | "linked"): string {
  return kind === "parked" ? "Parked" : "Linked";
}

/** Return the framework tag string for a site, or undefined. */
export function frameworkTag(site: YerdSite): string | undefined {
  if (site.is_laravel) return "Laravel";
  if (site.is_wordpress) return "WordPress";
  return undefined;
}
