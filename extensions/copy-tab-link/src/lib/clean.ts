import { parse } from "tldts";

export interface CleanTab {
  url: string;
  title: string;
  host: string;
  domain: string;
  path: string;
  scheme: string;
}

export interface CleanOptions {
  stripTracking: boolean;
  trackingParams: string[];
  removeFragment: boolean;
  stripSiteSuffix: boolean;
  titlePatterns: string[];
  stripEmoji: boolean;
  maxTitleLength?: number;
}

function matchesTrackingParam(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase();
  return patterns.some((pattern) => {
    const candidate = pattern.trim().toLowerCase();
    if (!candidate) return false;
    if (candidate.endsWith("*")) return lower.startsWith(candidate.slice(0, -1));
    return lower === candidate;
  });
}

export function cleanUrl(rawUrl: string, options: CleanOptions): string {
  try {
    const url = new URL(rawUrl);

    if (options.stripTracking && options.trackingParams.length > 0) {
      const names = [...url.searchParams.keys()];
      for (const name of names) {
        if (matchesTrackingParam(name, options.trackingParams)) {
          url.searchParams.delete(name);
        }
      }
    }

    if (options.removeFragment) {
      url.hash = "";
    }

    let result = url.toString();
    // URL.toString keeps a lone "?" behind when every parameter was removed.
    result = result.replace(/\?(?=$|#)/, "");
    return result;
  } catch {
    return rawUrl;
  }
}

const EMOJI_PATTERN = /\p{Extended_Pictographic}|\p{Emoji_Modifier}|\uFE0F|\u20E3/gu;
const SITE_SUFFIX_PATTERN = /\s+[-–—|·•]\s+[^-–—|·•]{1,60}$/;

export function cleanTitle(rawTitle: string, options: CleanOptions): string {
  let title = rawTitle ?? "";

  for (const pattern of options.titlePatterns) {
    if (!pattern.trim()) continue;
    try {
      title = title.replace(new RegExp(pattern, "g"), "");
    } catch {
      // An invalid regular expression should never break the copy itself.
    }
  }

  if (options.stripEmoji) {
    title = title.replace(EMOJI_PATTERN, "");
  }

  if (options.stripSiteSuffix) {
    const shortened = title.replace(SITE_SUFFIX_PATTERN, "");
    if (shortened.trim().length > 0) {
      title = shortened;
    }
  }

  title = title.replace(/\s+/g, " ").trim();

  // The ellipsis counts towards the limit, otherwise the result is one
  // character longer than the user asked for.
  if (options.maxTitleLength && options.maxTitleLength > 0 && title.length > options.maxTitleLength) {
    title = `${title.slice(0, Math.max(1, options.maxTitleLength - 1)).trimEnd()}…`;
  }

  return title;
}

export function toCleanTab(rawUrl: string, rawTitle: string, options: CleanOptions): CleanTab {
  const url = cleanUrl(rawUrl, options);
  let host = "";
  let path = "";
  let scheme = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname;
    path = parsed.pathname;
    scheme = parsed.protocol.replace(":", "");
  } catch {
    host = "";
  }

  const info = host ? parse(host, { allowPrivateDomains: false }) : undefined;
  const title = cleanTitle(rawTitle, options) || host || url;

  return { url, title, host, domain: info?.domain ?? host, path, scheme };
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function splitPatterns(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(";;")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value || !value.trim()) return undefined;
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
