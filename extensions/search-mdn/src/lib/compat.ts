import fetch from "node-fetch";

import { Cache, Icon } from "@raycast/api";

import { MDN_BASE_URL, toMdnPath } from "@/lib/mdn";
import type { BaselineAvailability, BrowserSupportRow, CompatMatch } from "@/types";

type BaselinePayload = {
  baseline?: BaselineAvailability;
  baseline_low_date?: string;
  baseline_high_date?: string;
  support?: Record<string, string | false>;
};

type DocPayload = {
  baseline?: BaselinePayload;
  browserCompat?: string[];
};

type DocIndexPayload = {
  doc?: DocPayload;
};

type RawSupportStatement = {
  version_added?: string | boolean | null;
  version_removed?: string | null;
  release_date?: string;
  prefix?: string;
  alternative_name?: string;
  partial_implementation?: boolean;
  flags?: unknown[];
};

type RawSupportValue =
  | RawSupportStatement
  | "mirror"
  | [RawSupportStatement | "mirror", ...(RawSupportStatement | "mirror")[]];

type BcdCompatPayload = {
  data?: {
    __compat?: {
      support?: Record<string, RawSupportValue | undefined>;
    };
  };
  browsers?: Record<string, { name?: string; upstream?: string }>;
};

type CachedCompatEntry = {
  fetchedAt: number;
  value: CompatMatch | null;
};

type BaselineBadge = {
  text: string;
  icon: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const cache = new Cache({ namespace: "mdn-compat-v2" });
const BCD_BASE_URL = "https://bcd.developer.mozilla.org/bcd/api/v0/current";

const browserLabels: Record<string, string> = {
  chrome: "Chrome",
  chrome_android: "Chrome Android",
  edge: "Edge",
  firefox: "Firefox",
  firefox_android: "Firefox Android",
  ie: "Internet Explorer",
  nodejs: "Node.js",
  bun: "Bun",
  deno: "Deno",
  oculus: "Oculus Browser",
  opera: "Opera",
  opera_android: "Opera Android",
  safari: "Safari",
  safari_ios: "Safari iOS",
  samsunginternet_android: "Samsung Internet",
  webview_android: "Android WebView",
  webview_ios: "iOS WebView",
};

const browserIcons: Record<string, string> = {
  chrome: "browser-chrome.svg",
  chrome_android: "browser-chrome.svg",
  edge: "browser-edge.svg",
  firefox: "browser-firefox.svg",
  firefox_android: "browser-firefox.svg",
  ie: "browser-ie.svg",
  nodejs: "browser-nodejs.svg",
  bun: "browser-bun.svg",
  deno: "browser-deno.svg",
  oculus: "browser-oculus.svg",
  opera: "browser-opera.svg",
  opera_android: "browser-opera.svg",
  safari: "browser-safari.svg",
  safari_ios: "browser-safari.svg",
  samsunginternet_android: "browser-samsunginternet.svg",
  webview_android: "browser-android.svg",
  webview_ios: "browser-apple.svg",
};

const browserOrder = [
  "chrome",
  "edge",
  "firefox",
  "safari",
  "chrome_android",
  "firefox_android",
  "safari_ios",
  "samsunginternet_android",
  "webview_android",
  "webview_ios",
  "opera",
  "opera_android",
  "ie",
  "nodejs",
  "bun",
  "deno",
  "oculus",
];

const baselineBadges: Record<"high" | "low" | "limited", BaselineBadge> = {
  high: {
    text: "Widely available",
    icon: "baseline-widely.svg",
  },
  low: {
    text: "Newly available",
    icon: "baseline-newly.svg",
  },
  limited: {
    text: "Limited availability",
    icon: "baseline-limited.svg",
  },
};

const memoryCache = new Map<string, CachedCompatEntry>();
const inFlight = new Map<string, Promise<CompatMatch | undefined>>();

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt < ONE_DAY_MS;
}

export function getBrowserIcon(browserId: string): string {
  return browserIcons[browserId] ?? Icon.Globe;
}

function decorateCompatMatch(value: CompatMatch | null): CompatMatch | null {
  if (!value) {
    return value;
  }

  return {
    ...value,
    browsers: value.browsers.map((row) => ({
      ...row,
      icon: row.icon ?? getBrowserIcon(row.browserId),
    })),
  };
}

function toCacheKey(path: string): string {
  return toMdnPath(path);
}

function parseCachedEntry(path: string): CachedCompatEntry | undefined {
  const raw = cache.get(toCacheKey(path));
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw) as CachedCompatEntry;
  } catch {
    cache.remove(toCacheKey(path));
    return undefined;
  }
}

function cacheEntry(path: string, value: CompatMatch | null) {
  cache.set(
    toCacheKey(path),
    JSON.stringify({
      fetchedAt: Date.now(),
      value,
    } satisfies CachedCompatEntry),
  );
}

function normalizeBaseline(value: unknown): BaselineAvailability {
  if (value === "high" || value === "low" || value === false) {
    return value;
  }

  return undefined;
}

function getBaselineDate(baseline: BaselineAvailability, payload: BaselinePayload | undefined): string | undefined {
  if (baseline === "high") {
    return payload?.baseline_high_date;
  }

  if (baseline === "low") {
    return payload?.baseline_low_date;
  }

  return undefined;
}

function toIndexJsonUrl(path: string): string {
  const normalizedPath = toMdnPath(path);
  return `${MDN_BASE_URL}${normalizedPath}/index.json`;
}

function toBcdUrl(compatKey: string): string {
  return `${BCD_BASE_URL}/${encodeURIComponent(compatKey)}.json`;
}

function normalizeSupportFromBaseline(support: unknown): BrowserSupportRow[] {
  if (!support || typeof support !== "object") {
    return [];
  }

  const supportRecord = support as Record<string, string | false>;
  const availableIds = Object.keys(supportRecord);

  const orderedIds = [
    ...browserOrder.filter((browserId) => availableIds.includes(browserId)),
    ...availableIds.filter((browserId) => !browserOrder.includes(browserId)).sort(),
  ];

  return orderedIds.map((browserId) => {
    const value = supportRecord[browserId];

    return {
      browserId,
      browserName: browserLabels[browserId] ?? browserId,
      icon: getBrowserIcon(browserId),
      support: value === false ? "No" : `Added ${value}`,
    };
  });
}

function pickSupportStatement(value: RawSupportValue | undefined): RawSupportStatement | "mirror" | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function formatSupportStatement(statement: RawSupportStatement): { support: string; releaseDate?: string } {
  const versionAdded = statement.version_added;
  const versionRemoved = statement.version_removed;

  let supportText: string;
  if (versionAdded === false) {
    supportText = "No";
  } else if (versionAdded === true) {
    supportText = "Yes";
  } else if (typeof versionAdded === "string") {
    supportText = `Added ${versionAdded}`;
  } else {
    supportText = "Unknown";
  }

  if (typeof versionRemoved === "string" && versionRemoved.length > 0) {
    const added = typeof versionAdded === "string" ? versionAdded : "?";
    supportText = `Added ${added}, removed ${versionRemoved}`;
  }

  const tags: string[] = [];
  if (statement.partial_implementation) {
    tags.push("partial");
  }
  if (Array.isArray(statement.flags) && statement.flags.length > 0) {
    tags.push("flagged");
  }
  if (typeof statement.prefix === "string" && statement.prefix.length > 0) {
    tags.push(`prefix ${statement.prefix}`);
  }
  if (typeof statement.alternative_name === "string" && statement.alternative_name.length > 0) {
    tags.push(`as ${statement.alternative_name}`);
  }

  if (tags.length) {
    supportText = `${supportText} (${tags.join(", ")})`;
  }

  return {
    support: supportText,
    releaseDate: typeof statement.release_date === "string" ? statement.release_date : undefined,
  };
}

function resolveSupportStatement(
  browserId: string,
  supportRecord: Record<string, RawSupportValue | undefined>,
  browsers: Record<string, { name?: string; upstream?: string }> | undefined,
  visited = new Set<string>(),
): { support: string; releaseDate?: string } {
  const raw = pickSupportStatement(supportRecord[browserId]);
  if (!raw) {
    return { support: "Unknown" };
  }

  if (raw === "mirror") {
    const upstream = browsers?.[browserId]?.upstream;
    if (!upstream || visited.has(upstream)) {
      return { support: "Same as upstream" };
    }

    visited.add(upstream);
    const resolved = resolveSupportStatement(upstream, supportRecord, browsers, visited);
    const upstreamName = browserLabels[upstream] ?? browsers?.[upstream]?.name ?? upstream;

    return {
      support: `Same as ${upstreamName}: ${resolved.support}`,
      releaseDate: resolved.releaseDate,
    };
  }

  return formatSupportStatement(raw);
}

function normalizeSupportFromBcd(payload: BcdCompatPayload): BrowserSupportRow[] {
  const supportRecord = payload.data?.__compat?.support;
  if (!supportRecord || typeof supportRecord !== "object") {
    return [];
  }

  const availableIds = Object.keys(supportRecord);
  const orderedIds = [
    ...browserOrder.filter((browserId) => availableIds.includes(browserId)),
    ...availableIds.filter((browserId) => !browserOrder.includes(browserId)).sort(),
  ];

  return orderedIds.map((browserId) => {
    const resolved = resolveSupportStatement(browserId, supportRecord, payload.browsers);
    const support = resolved.releaseDate ? `${resolved.support} • ${resolved.releaseDate}` : resolved.support;

    return {
      browserId,
      browserName: browserLabels[browserId] ?? payload.browsers?.[browserId]?.name ?? browserId,
      icon: getBrowserIcon(browserId),
      support,
      releaseDate: resolved.releaseDate,
    };
  });
}

async function fetchBcdSupportRows(compatKey: string): Promise<BrowserSupportRow[]> {
  const response = await fetch(toBcdUrl(compatKey));
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as BcdCompatPayload;
  return normalizeSupportFromBcd(payload);
}

function buildCompatMatch(
  path: string,
  payload: DocPayload | undefined,
  browsers: BrowserSupportRow[],
): CompatMatch | undefined {
  const baseline = normalizeBaseline(payload?.baseline?.baseline);
  const compatKey = Array.isArray(payload?.browserCompat) ? payload?.browserCompat[0] : undefined;
  const baselineDate = getBaselineDate(baseline, payload?.baseline);

  if (!compatKey && baseline === undefined && browsers.length === 0) {
    return undefined;
  }

  return {
    compatKey: compatKey ?? "unknown",
    mdnPath: toMdnPath(path),
    matchType: "exact",
    baseline,
    baselineDate,
    browsers,
  };
}

async function fetchCompatFromMdn(path: string): Promise<CompatMatch | undefined> {
  const response = await fetch(toIndexJsonUrl(path));

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as DocIndexPayload;
  const doc = payload.doc;

  const compatKey = Array.isArray(doc?.browserCompat) ? doc?.browserCompat[0] : undefined;
  let browsers: BrowserSupportRow[] = [];

  if (compatKey) {
    try {
      browsers = await fetchBcdSupportRows(compatKey);
    } catch {
      browsers = normalizeSupportFromBaseline(doc?.baseline?.support);
    }
  } else {
    browsers = normalizeSupportFromBaseline(doc?.baseline?.support);
  }

  return buildCompatMatch(path, doc, browsers);
}

export function readCachedCompat(path: string): CompatMatch | null | undefined {
  const normalizedPath = toMdnPath(path);

  const fromMemory = memoryCache.get(normalizedPath);
  if (fromMemory) {
    if (isFresh(fromMemory.fetchedAt)) {
      return decorateCompatMatch(fromMemory.value);
    }

    memoryCache.delete(normalizedPath);
  }

  const cached = parseCachedEntry(normalizedPath);
  if (!cached) {
    return undefined;
  }

  if (!isFresh(cached.fetchedAt)) {
    return undefined;
  }

  const decorated = decorateCompatMatch(cached.value);
  memoryCache.set(normalizedPath, {
    fetchedAt: cached.fetchedAt,
    value: decorated,
  });

  return decorated;
}

export async function getCompat(path: string): Promise<CompatMatch | undefined> {
  const normalizedPath = toMdnPath(path);
  const fromMemory = readCachedCompat(normalizedPath);
  if (fromMemory !== undefined) {
    return fromMemory ?? undefined;
  }

  if (inFlight.has(normalizedPath)) {
    return inFlight.get(normalizedPath);
  }

  const pending = (async () => {
    const stale = parseCachedEntry(normalizedPath);
    if (stale && isFresh(stale.fetchedAt)) {
      const decorated = decorateCompatMatch(stale.value);
      memoryCache.set(normalizedPath, {
        fetchedAt: stale.fetchedAt,
        value: decorated,
      });

      return decorated ?? undefined;
    }

    try {
      const fetched = await fetchCompatFromMdn(normalizedPath);
      const storedValue = decorateCompatMatch(fetched ?? null);
      memoryCache.set(normalizedPath, {
        fetchedAt: Date.now(),
        value: storedValue,
      });
      cacheEntry(normalizedPath, storedValue);
      return storedValue ?? undefined;
    } catch {
      if (stale) {
        const decorated = decorateCompatMatch(stale.value);
        memoryCache.set(normalizedPath, {
          fetchedAt: stale.fetchedAt,
          value: decorated,
        });

        return decorated ?? undefined;
      }

      memoryCache.set(normalizedPath, {
        fetchedAt: Date.now(),
        value: null,
      });
      cacheEntry(normalizedPath, null);
      return undefined;
    }
  })();

  inFlight.set(normalizedPath, pending);

  try {
    return await pending;
  } finally {
    inFlight.delete(normalizedPath);
  }
}

export function getBaselineBadge(baseline: BaselineAvailability): BaselineBadge | undefined {
  if (baseline === "high") {
    return baselineBadges.high;
  }

  if (baseline === "low") {
    return baselineBadges.low;
  }

  if (baseline === false) {
    return baselineBadges.limited;
  }

  return undefined;
}
