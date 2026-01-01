/**
 * Domain parsing and manipulation utilities
 */

/**
 * Extracts the root domain from a subdomain
 * Examples:
 *   www.peacocktv.com → peacocktv.com
 *   api-global.netflix.com → netflix.com
 *   sessions.bugsnag.com → bugsnag.com
 *   example.co.uk → example.co.uk
 */
export function getRootDomain(domain: string): string {
  const parts = domain.split(".");

  // Handle common TLDs with country codes (e.g., .co.uk, .com.au)
  const twoPartTlds = ["co.uk", "com.au", "co.nz", "co.za", "com.br"];
  const lastTwoParts = parts.slice(-2).join(".");

  if (twoPartTlds.includes(lastTwoParts)) {
    // For domains like example.co.uk, return last 3 parts
    return parts.slice(-3).join(".");
  }

  // For standard TLDs, return last 2 parts (domain.tld)
  return parts.slice(-2).join(".");
}

/**
 * Checks if a domain is already a root domain (no subdomain)
 */
export function isRootDomain(domain: string): boolean {
  return getRootDomain(domain) === domain;
}

/**
 * Groups blocked domains by their root domain
 */
export interface GroupedDomain {
  rootDomain: string;
  subdomains: string[];
  count: number;
}

export function groupByRootDomain(domains: string[]): GroupedDomain[] {
  const grouped = new Map<string, Set<string>>();

  for (const domain of domains) {
    const root = getRootDomain(domain);
    if (!grouped.has(root)) {
      grouped.set(root, new Set());
    }
    grouped.get(root)!.add(domain);
  }

  return Array.from(grouped.entries()).map(([rootDomain, subdomainSet]) => ({
    rootDomain,
    subdomains: Array.from(subdomainSet).sort(),
    count: subdomainSet.size,
  }));
}
