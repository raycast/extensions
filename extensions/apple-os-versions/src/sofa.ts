const FEED_BASE = "https://sofafeed.macadmins.io/v2";
const SITE_BASE = "https://sofa.macadmins.io";

export type Platform = "macOS" | "iOS" | "iPadOS" | "watchOS" | "tvOS" | "visionOS";

export const PLATFORMS: Platform[] = ["macOS", "iOS", "iPadOS", "watchOS", "tvOS", "visionOS"];

// Feeds whose OSVersion looks like "tvOS 27"; their SOFA pages live at /tvos/tvos27.
const NUMBERED_FEEDS = [
  { platform: "watchOS", feed: "watchos_data_feed" },
  { platform: "tvOS", feed: "tvos_data_feed" },
  { platform: "visionOS", feed: "visionos_data_feed" },
] as const;

export type Cve = {
  id: string;
  severity?: string;
  exploited: boolean;
  inKEV: boolean;
  nistUrl: string;
};

export type PastRelease = {
  key: string;
  version: string;
  build?: string;
  releaseDate: string;
  securityUrl?: string;
  // Shipped only to some devices, so it can be newer than the release shown on the main row.
  deviceSpecific: boolean;
};

export type Release = {
  key: string;
  platform: Platform;
  title: string;
  version: string;
  // SOFA occasionally lists a release without a build (e.g. visionOS 2.6).
  build?: string;
  allBuilds: string[];
  releaseDate: string;
  cves: Cve[];
  exploitedCves: string[];
  securityUrl?: string;
  sofaUrl: string;
  earlierReleases: PastRelease[];
};

type FeedEntry = { osVersion: string; latest: Record<string, unknown>; history: unknown };

// The feed is untrusted JSON, so every field is checked before use instead of trusting a type cast.
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Non-empty string with control characters removed (these values end up in the clipboard).
function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned || undefined;
}

function texts(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter((item): item is string => item !== undefined) : [];
}

// Feed URLs are only trusted when they are https on the host the UI labels them with.
function safeUrl(value: unknown, host: string): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === host && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

// Exploited CVEs first, then newest CVE ID first.
export function compareCves(a: Cve, b: Cve): number {
  return Number(b.exploited) - Number(a.exploited) || b.id.localeCompare(a.id, undefined, { numeric: true });
}

function toCves(latest: Record<string, unknown>): Cve[] {
  const exploited = new Set(texts(latest.ActivelyExploitedCVEs));
  const cves = isRecord(latest.CVEs) ? latest.CVEs : {};
  return Object.entries(cves)
    .flatMap(([key, value]) => {
      const id = text(key);
      if (!id) return [];
      const info = isRecord(value) ? value : {};
      return {
        id,
        severity: text(info.Severity),
        exploited: info.ActivelyExploited === true || exploited.has(id),
        inKEV: info.InKEV === true,
        nistUrl: safeUrl(info.NISTURL, "nvd.nist.gov") ?? `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(id)}`,
      };
    })
    .sort(compareCves);
}

// SOFA's SecurityReleases, newest first, without the release on the main row and without exact duplicates.
function toEarlierReleases(history: unknown, latestVersion: string, latestBuild: string | undefined): PastRelease[] {
  const seen = new Set<string>();
  let skippedLatest = false;
  return (Array.isArray(history) ? history : []).flatMap((item: unknown) => {
    if (!isRecord(item)) return [];
    const version = text(item.ProductVersion);
    const build = text(item.Build);
    const releaseDate = text(item.ReleaseDate);
    if (!version || !releaseDate || Number.isNaN(Date.parse(releaseDate))) return [];
    const key = `${version}|${build ?? ""}|${releaseDate}`;
    if (seen.has(key)) return [];
    seen.add(key);
    if (!skippedLatest && version === latestVersion && build === latestBuild) {
      skippedLatest = true;
      return [];
    }
    return {
      key,
      version,
      build,
      releaseDate,
      securityUrl: safeUrl(item.SecurityInfo, "support.apple.com"),
      deviceSpecific: item.DeviceScope === "device-specific",
    };
  });
}

// Returns undefined for releases missing a version or valid date, so one bad entry doesn't break the list.
function toRelease(
  platform: Platform,
  titlePrefix: string,
  sofaUrl: string,
  { latest, history }: FeedEntry,
): Release | undefined {
  const version = text(latest.ProductVersion);
  const build = text(latest.Build);
  const releaseDate = text(latest.ReleaseDate);
  if (!version || !releaseDate || Number.isNaN(Date.parse(releaseDate))) return undefined;
  const allBuilds = texts(latest.AllBuilds);
  return {
    key: `${platform}-${version}`,
    platform,
    title: `${titlePrefix} ${version}`,
    version,
    build,
    allBuilds: allBuilds.length ? allBuilds : build ? [build] : [],
    releaseDate,
    cves: toCves(latest),
    exploitedCves: texts(latest.ActivelyExploitedCVEs),
    securityUrl: safeUrl(latest.SecurityInfo, "support.apple.com"),
    sofaUrl,
    earlierReleases: toEarlierReleases(history, version, build),
  };
}

async function fetchFeed(name: string): Promise<FeedEntry[]> {
  const response = await fetch(`${FEED_BASE}/${name}.json`);
  if (!response.ok) {
    throw new Error(`SOFA ${name} returned ${response.status} ${response.statusText}`);
  }
  const feed: unknown = await response.json();
  if (!isRecord(feed) || !Array.isArray(feed.OSVersions)) {
    throw new Error(`SOFA ${name} has an unexpected format`);
  }
  return feed.OSVersions.flatMap((entry: unknown) => {
    const osVersion = isRecord(entry) ? text(entry.OSVersion) : undefined;
    return osVersion && isRecord(entry) && isRecord(entry.Latest)
      ? { osVersion, latest: entry.Latest, history: entry.SecurityReleases }
      : [];
  });
}

function isRelease(release: Release | undefined): release is Release {
  return release !== undefined;
}

export async function fetchReleases(): Promise<Release[]> {
  const [macos, ios, ...numbered] = await Promise.all([
    fetchFeed("macos_data_feed"),
    fetchFeed("ios_data_feed"),
    ...NUMBERED_FEEDS.map(({ feed }) => fetchFeed(feed)),
  ]);

  // macOS OSVersion looks like "Golden Gate 27"; the marketing name drives the SOFA page slug.
  const macReleases = macos.map((entry) => {
    const { osVersion } = entry;
    const name = osVersion.replace(/\s*\d+$/, "");
    const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, ""));
    return toRelease("macOS", `macOS ${name}`, `${SITE_BASE}/macos/${slug}`, entry);
  });

  // SOFA publishes iOS and iPadOS as a single release, so both platforms share the same data.
  const mobileReleases = (["iOS", "iPadOS"] as const).flatMap((platform) =>
    ios.map((entry) =>
      toRelease(platform, platform, `${SITE_BASE}/ios/ios${encodeURIComponent(entry.osVersion)}`, entry),
    ),
  );

  const numberedReleases = NUMBERED_FEEDS.flatMap(({ platform }, index) =>
    numbered[index].map((entry) => {
      const major = entry.osVersion.match(/\d+$/)?.[0] ?? "";
      const section = platform.toLowerCase();
      return toRelease(platform, platform, `${SITE_BASE}/${section}/${section}${major}`, entry);
    }),
  );

  return [...macReleases, ...mobileReleases, ...numberedReleases].filter(isRelease);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
