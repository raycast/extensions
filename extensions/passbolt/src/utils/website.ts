import { getDomain } from "tldts";
import type { Resource } from "../types";

export function websiteHostname(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) && !/^[^/:]+:\d+(?:\/|$)/.test(value);
    const url = new URL(hasScheme ? value : `https://${value}`);
    return ["https:", "http:"].includes(url.protocol) ? url.hostname.toLowerCase().replace(/\.$/, "") : undefined;
  } catch {
    return undefined;
  }
}

export interface ActiveWebsite {
  url: string;
  title?: string;
}

// The current website only needs parsing once per ranking pass instead of once per entry.
export interface WebsiteMatchContext {
  host: string;
  domain: string | null;
  title?: string;
}

export function websiteMatchContext(currentUrl?: string, title?: string): WebsiteMatchContext | undefined {
  const host = websiteHostname(currentUrl);
  if (!host) return undefined;
  return { host, domain: getDomain(host, { allowPrivateDomains: true }), title };
}

export function websiteScore(resource: Resource, context?: WebsiteMatchContext): number {
  if (!context) return 0;
  let score = 0;
  for (const uri of [resource.uri, ...(resource.uris ?? [])]) {
    const host = websiteHostname(uri);
    if (!host) continue;
    if (host === context.host) return 2;
    if (context.domain && getDomain(host, { allowPrivateDomains: true }) === context.domain) score = 1;
  }
  return score;
}

export function websiteMatchScore(resource: Resource, currentUrl?: string): number {
  return websiteScore(resource, websiteMatchContext(currentUrl));
}

const titleStopWords = new Set([
  "login",
  "signin",
  "sign",
  "account",
  "admin",
  "app",
  "cloud",
  "console",
  "dashboard",
  "home",
  "password",
  "portal",
  "service",
  "sso",
  "workspace",
  "web",
]);

function titleTokens(value?: string | null): string[] {
  return (
    value
      ?.normalize("NFKC")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  )
    .map((token) => (token === "oci" || token === "oraclecloud" ? "oracle" : token))
    .filter((token) => token.length >= 4 && !titleStopWords.has(token));
}

export function websiteTitleScore(labels: (string | null | undefined)[], title?: string): number {
  const tokens = new Set(titleTokens(title));
  return labels.some((label) => titleTokens(label).some((token) => tokens.has(token))) ? 1 : 0;
}

export function websiteRelevanceScore(
  resource: Resource,
  context?: WebsiteMatchContext,
  extraLabels: (string | null | undefined)[] = [],
): number {
  if (!context) return 0;
  const urlScore = websiteScore(resource, context);
  if (urlScore) return urlScore === 2 ? 4 : 3;
  // Only Oracle's two known registrable domains share a provider alias.
  const oracleDomains = new Set(["oracle.com", "oraclecloud.com"]);
  if (context.domain && oracleDomains.has(context.domain)) {
    for (const uri of [resource.uri, ...(resource.uris ?? [])]) {
      const host = websiteHostname(uri);
      const domain = host && getDomain(host, { allowPrivateDomains: true });
      if (domain && oracleDomains.has(domain)) return 3;
    }
  }
  // Title matching is only a fallback for entries without a saved URL: an entry
  // saved for another website must never surface as the current site's match.
  if (resource.uri || (resource.uris ?? []).length) return 0;
  return websiteTitleScore([resource.name, ...extraLabels], context.title);
}

export function chooseActiveWebsite<T extends Resource>(
  resources: T[],
  websites: ActiveWebsite[],
  extraLabels: (resource: T) => (string | null | undefined)[] = () => [],
): ActiveWebsite | undefined {
  if (websites.length === 1) return websites[0];
  let chosen: ActiveWebsite | undefined;
  let bestScore = 0;
  let bestCount = 0;
  for (const website of websites) {
    const context = websiteMatchContext(website.url, website.title);
    let score = 0;
    let count = 0;
    for (const resource of resources) {
      const relevance = websiteRelevanceScore(resource, context, extraLabels(resource));
      score = Math.max(score, relevance);
      if (relevance > 0) count++;
    }
    if (score > bestScore || (score === bestScore && count > bestCount)) {
      chosen = website;
      bestScore = score;
      bestCount = count;
    }
  }
  return chosen;
}

// Score once per entry, sorting only matches so the remaining vault order is preserved.
export function partitionResourcesByWebsite<T extends Resource>(resources: T[], currentUrl?: string, title?: string) {
  const context = websiteMatchContext(currentUrl, title);
  const matching: { resource: T; score: number }[] = [];
  const others: T[] = [];
  for (const resource of resources) {
    const score = websiteRelevanceScore(resource, context);
    if (score > 0) matching.push({ resource, score });
    else others.push(resource);
  }
  matching.sort(
    (a, b) =>
      b.score - a.score ||
      Number(Boolean(b.resource.favorite)) - Number(Boolean(a.resource.favorite)) ||
      (a.resource.name ?? "").localeCompare(b.resource.name ?? ""),
  );
  return { matching: matching.map(({ resource }) => resource), others };
}
