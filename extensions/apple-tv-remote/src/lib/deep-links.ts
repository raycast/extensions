import { LocalStorage } from "@raycast/api";

/**
 * Well-known tvOS streaming apps. Bundle launches always work; `titleUrl`
 * deep links open a specific show/movie where the app registers the pattern
 * (confirmed working in pyatv's docs for Netflix, Disney+, Max, Apple TV).
 */
export interface KnownApp {
  name: string;
  bundleId: string;
  aliases: string[];
  /** Build a deep link from a service-specific content ID, when supported. */
  titleUrl?: (contentId: string) => string;
}

export const KNOWN_APPS: KnownApp[] = [
  {
    name: "Netflix",
    bundleId: "com.netflix.Netflix",
    aliases: ["netflix"],
    titleUrl: (id) => `https://www.netflix.com/title/${id}`,
  },
  {
    name: "Disney+",
    bundleId: "com.disney.disneyplus",
    aliases: ["disney", "disney+", "disney plus", "disneyplus"],
  },
  {
    name: "Max",
    bundleId: "com.wbd.stream",
    aliases: ["max", "hbo", "hbo max"],
  },
  {
    name: "Apple TV",
    bundleId: "com.apple.TVWatchList",
    aliases: ["apple tv", "apple tv+", "tv app", "apple tv plus"],
    titleUrl: (id) => `https://tv.apple.com/show/${id}?action=play`,
  },
  {
    name: "YouTube",
    bundleId: "com.google.ios.youtube",
    aliases: ["youtube", "yt"],
  },
  {
    name: "Hulu",
    bundleId: "com.hulu.plus",
    aliases: ["hulu"],
  },
  {
    name: "Prime Video",
    bundleId: "com.amazon.aiv.AIVApp",
    aliases: ["prime", "prime video", "amazon", "amazon prime"],
  },
  {
    name: "Spotify",
    bundleId: "com.spotify.client",
    aliases: ["spotify"],
  },
  {
    name: "Plex",
    bundleId: "com.plexapp.plex",
    aliases: ["plex"],
  },
  {
    name: "Settings",
    bundleId: "com.apple.TVSettings",
    aliases: ["settings"],
  },
];

/** Match a user-supplied app name against the known apps and the live app list. */
export function resolveAppName(
  query: string,
  installed: Record<string, string> = {},
): { bundleId: string; name: string } | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;

  // Exact/alias match against the curated map first (handles "hbo" → Max etc.)
  for (const app of KNOWN_APPS) {
    if (app.name.toLowerCase() === q || app.aliases.includes(q)) {
      return { bundleId: app.bundleId, name: app.name };
    }
  }

  // Then fuzzy match against what's actually installed on the device.
  for (const [bundleId, name] of Object.entries(installed)) {
    const n = name.toLowerCase();
    if (n === q || n.includes(q) || q.includes(n)) {
      return { bundleId, name };
    }
  }

  // Finally substring match the curated map.
  for (const app of KNOWN_APPS) {
    if (app.name.toLowerCase().includes(q) || app.aliases.some((a) => a.includes(q))) {
      return { bundleId: app.bundleId, name: app.name };
    }
  }

  return null;
}

const APP_CACHE_KEY = "atv:apps";

export interface CachedApps {
  apps: Record<string, string>;
  fetchedAt: number;
}

export async function loadCachedApps(): Promise<CachedApps | null> {
  const raw = await LocalStorage.getItem<string>(APP_CACHE_KEY);
  return raw ? (JSON.parse(raw) as CachedApps) : null;
}

export async function saveCachedApps(apps: Record<string, string>): Promise<void> {
  await LocalStorage.setItem(APP_CACHE_KEY, JSON.stringify({ apps, fetchedAt: Date.now() } satisfies CachedApps));
}
