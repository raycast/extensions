import { execSafe } from "./exec";

/** Bundle ids with a nicer product name than their app/binary file name. */
const PRETTY_NAMES: Record<string, string> = {
  "com.apple.Music": "Apple Music",
  "com.apple.podcasts": "Apple Podcasts",
  "com.apple.TV": "Apple TV",
  "com.spotify.client": "Spotify",
  "com.tidal.desktop": "TIDAL",
  "com.deezer.deezer-desktop": "Deezer",
  "com.amazon.music": "Amazon Music",
  "org.videolan.vlc": "VLC",
  "com.apple.Safari": "Safari",
  "com.google.Chrome": "Google Chrome",
  "org.mozilla.firefox": "Firefox",
  "company.thebrowser.Browser": "Arc",
};

const cache = new Map<string, string>();

/**
 * Best-effort human app name for a bundle id. Known ids map to product names; otherwise
 * resolve the installed app's file name via Spotlight — this is what turns an opaque
 * browser-PWA id (e.g. `com.google.Chrome.app.<hash>`) into "YouTube Music". Results are
 * cached per bundle id, and it falls back to the provided name when nothing resolves.
 */
export async function resolveAppName(
  bundleId: string | undefined,
  fallback: string,
): Promise<string> {
  if (!bundleId) return fallback;
  const known = PRETTY_NAMES[bundleId];
  if (known) return known;
  const cached = cache.get(bundleId);
  if (cached) return cached;

  let resolved = fallback;
  // Guard the Spotlight query against anything but a plain bundle id.
  if (/^[A-Za-z0-9._-]+$/.test(bundleId)) {
    const out = await execSafe(
      "mdfind",
      [`kMDItemCFBundleIdentifier == '${bundleId}'`],
      { retries: 0 },
    );
    const path = out?.split("\n")[0]?.trim();
    const name = path
      ?.split("/")
      .pop()
      ?.replace(/\.app$/, "");
    if (name) resolved = name;
  }

  cache.set(bundleId, resolved);
  return resolved;
}
