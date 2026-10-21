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

// The current website only needs parsing once per ranking pass instead of once per entry.
export interface WebsiteMatchContext {
  host: string;
  domain: string | null;
}

export function websiteMatchContext(currentUrl?: string): WebsiteMatchContext | undefined {
  const host = websiteHostname(currentUrl);
  if (!host) return undefined;
  return { host, domain: getDomain(host, { allowPrivateDomains: true }) };
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

// Score once per entry, sorting only matches so the remaining vault order is preserved.
export function partitionResourcesByWebsite<T extends Resource>(resources: T[], currentUrl?: string) {
  const context = websiteMatchContext(currentUrl);
  const matching: { resource: T; score: number }[] = [];
  const others: T[] = [];
  for (const resource of resources) {
    const score = websiteScore(resource, context);
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
