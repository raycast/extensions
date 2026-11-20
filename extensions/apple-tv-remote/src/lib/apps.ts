import { Cache } from "@raycast/api";
import { AppleTVConnection } from "@bharper/atv-js";
import { launchApp, listApps } from "./companion-extras";
import { withConnection } from "./connection";

/**
 * Everything we know about a tvOS streaming app: how users refer to it, how
 * to launch it, and which JustWatch providers stream through it.
 */
export interface KnownApp {
  name: string;
  bundleId: string;
  aliases: string[];
  /** JustWatch provider technical names that play inside this app; a trailing * matches a prefix (channels). */
  providers?: string[];
  /** Per-app URL fixups for tvOS routing quirks. */
  adaptUrl?: (url: string) => string;
  /**
   * Select on whatever its links land on continues to playback: a profile
   * picker (the highlighted profile) or a show page whose focused button is
   * Play or Resume. Checked on tvOS 27; elsewhere Select stays unpressed.
   */
  resumes?: boolean;
}

export const KNOWN_APPS: KnownApp[] = [
  {
    name: "Netflix",
    bundleId: "com.netflix.Netflix",
    aliases: ["netflix"],
    providers: ["netflix*"],
  },
  {
    name: "Disney+",
    bundleId: "com.disney.disneyplus",
    aliases: ["disney", "disney+", "disney plus", "disneyplus"],
    providers: ["disneyplus"],
    resumes: true,
  },
  {
    name: "Max",
    bundleId: "com.wbd.stream",
    aliases: ["max", "hbo", "hbo max"],
    providers: ["max", "hbomax"],
    resumes: true,
    // tvOS refuses www.hbomax.com/<region>/… links; the app claims play.hbomax.com.
    adaptUrl: (url) => {
      const [, kind, id] = url.match(/\/(show|movie)\/([\da-f-]{36})/) ?? [];
      return id ? `https://play.hbomax.com/${kind}/${id}` : url;
    },
  },
  {
    name: "Prime Video",
    bundleId: "com.amazon.aiv.AIVApp",
    aliases: ["prime", "prime video", "amazon", "amazon prime"],
    // Prime Video channels (amazonhbomax, amazonbinge, …) play inside the app.
    providers: ["amazon*"],
    resumes: true,
  },
  {
    name: "Apple TV",
    bundleId: "com.apple.TVWatchList",
    aliases: ["apple tv", "apple tv+", "tv app", "apple tv plus"],
    // Apple TV channels (appletvparamountplus, appletvbritbox, …) play inside the app.
    providers: ["appletv*", "itunes"],
    adaptUrl: (url) => (url.includes("?") ? `${url}&action=play` : `${url}?action=play`),
  },
  {
    name: "YouTube",
    bundleId: "com.google.ios.youtube",
    aliases: ["youtube", "yt"],
    providers: ["youtube", "youtubefree", "youtubered"],
    // The scheme form routes reliably on tvOS; plain https is refused.
    adaptUrl: (url) => {
      const id = url.match(/[?&]v=([\w-]+)/)?.[1];
      return id ? `youtube://www.youtube.com/watch?v=${id}` : url;
    },
  },
  { name: "Hulu", bundleId: "com.hulu.plus", aliases: ["hulu"], providers: ["hulu"] },
  // Paramount+ ships separate US and international apps; the installed one wins.
  {
    name: "Paramount+",
    bundleId: "com.cbsvideo.app",
    aliases: ["paramount", "paramount+", "paramount plus"],
    providers: ["paramountplus*"],
  },
  {
    name: "Paramount+",
    bundleId: "com.cbs.canada.app",
    aliases: ["paramount", "paramount+", "paramount plus"],
    providers: ["paramountplus*"],
  },
  { name: "Peacock", bundleId: "com.peacocktv.peacock", aliases: ["peacock"], providers: ["peacocktv*"] },
  { name: "Crunchyroll", bundleId: "com.crunchyroll.iphone", aliases: ["crunchyroll"], providers: ["crunchyroll"] },
  {
    name: "BBC iPlayer",
    bundleId: "uk.co.bbc.iplayer",
    aliases: ["iplayer", "bbc iplayer", "bbc"],
    providers: ["bbc"],
  },
  { name: "Stan", bundleId: "au.com.stan", aliases: ["stan"], providers: ["stan"] },
  { name: "Binge", bundleId: "au.com.streamotion.ares.prod", aliases: ["binge"], providers: ["binge"] },
  { name: "ABC iview", bundleId: "au.net.abc.ABCiView", aliases: ["iview", "abc iview", "abc"], providers: ["iview"] },
  {
    name: "SBS On Demand",
    bundleId: "au.com.sbs.ondemand",
    aliases: ["sbs", "sbs on demand"],
    providers: ["sbsondemand"],
  },
  { name: "Plex", bundleId: "com.plexapp.plex", aliases: ["plex"], providers: ["plex*"] },
  { name: "Spotify", bundleId: "com.spotify.client", aliases: ["spotify"] },
  { name: "Apple Music", bundleId: "com.apple.TVMusic", aliases: ["music", "apple music"] },
  { name: "Twitch", bundleId: "tv.twitch", aliases: ["twitch"] },
  {
    name: "Settings",
    bundleId: "com.apple.TVSettings",
    aliases: ["settings"],
  },
];

export interface ResolvedApp {
  bundleId: string;
  name: string;
}

/** The known app that plays a JustWatch provider's content, preferring one that's installed. */
export function appForProvider(technicalName: string, installed: Record<string, string> = {}): KnownApp | undefined {
  const plays = (app: KnownApp) =>
    app.providers?.some((p) => (p.endsWith("*") ? technicalName.startsWith(p.slice(0, -1)) : p === technicalName));
  const candidates = KNOWN_APPS.filter(plays);
  return candidates.find((app) => app.bundleId in installed) ?? candidates[0];
}

/**
 * Match an app name or bundle ID against the curated catalog and the
 * installed-app list. Exact matches win, curated aliases first ("hbo" is Max).
 * Substrings count only from three characters: a two-letter query matches half
 * a real app list, and launching the wrong app is worse than finding none.
 */
export function resolveAppName(query: string, installed: Record<string, string> = {}): ResolvedApp | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Installed entries first, so a name shared by regional variants (Paramount+) opens the one on this TV.
  const known = [...KNOWN_APPS]
    .sort((a, b) => Number(b.bundleId in installed) - Number(a.bundleId in installed))
    .map(({ bundleId, name, aliases }) => ({ bundleId, name, names: [name.toLowerCase(), ...aliases] }));
  const onDevice = Object.entries(installed).map(([bundleId, name]) => ({
    bundleId,
    name,
    names: [name.toLowerCase()],
  }));

  const app =
    [...known, ...onDevice].find((a) => a.bundleId.toLowerCase() === q || a.names.includes(q)) ??
    (q.length >= 3 ? [...onDevice, ...known].find((a) => a.names.some((n) => n.includes(q))) : undefined);
  return app ? { bundleId: app.bundleId, name: app.name } : null;
}

// The app list is disposable derived data, so it lives in Cache (on-disk,
// synchronous, evictable) rather than the encrypted LocalStorage database.
const cache = new Cache();
const APP_CACHE_KEY = "atv:apps";

/** Installed apps (bundle ID → display name) as of the last device fetch. */
export function loadCachedApps(): Record<string, string> | null {
  const raw = cache.get(APP_CACHE_KEY);
  return raw ? (JSON.parse(raw) as Record<string, string>) : null;
}

/** Installed apps as bundle ID → name, from the cache when it has them. */
export async function installedApps(conn: AppleTVConnection): Promise<Record<string, string>> {
  return loadCachedApps() ?? (await refreshInstalledApps(conn).catch(() => ({})));
}

/** Fetch the installed apps from the device and refresh the cache. */
export async function refreshInstalledApps(conn: AppleTVConnection): Promise<Record<string, string>> {
  const apps = await listApps(conn);
  cache.set(APP_CACHE_KEY, JSON.stringify(apps));
  return apps;
}

/**
 * Resolve an app name or bundle ID against the installed apps and launch it.
 * The cached list answers without a round trip; with no cache, or no match in
 * it, the device's live list is fetched over the same connection. Matching
 * always knows what's installed, so a name shared by regional variants
 * (Paramount+) opens the one on this TV.
 */
export async function launchAppByName(query: string): Promise<ResolvedApp | null> {
  return withConnection(async (conn) => {
    const live = () => refreshInstalledApps(conn).catch(() => ({}));
    const cached = loadCachedApps();
    const resolved = cached
      ? (resolveAppName(query, cached) ?? resolveAppName(query, await live()))
      : resolveAppName(query, await live());
    if (resolved) await launchApp(conn, resolved.bundleId);
    return resolved;
  });
}
