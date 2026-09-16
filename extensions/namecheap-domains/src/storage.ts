import { Cache, LocalStorage } from "@raycast/api";
import type { Domain, DomainListType, PricingTable } from "./namecheap/types";

/**
 * Where things are kept, and why.
 *
 * Raycast's Cache API writes plain JSON files under Application Support that anything running as the user can
 * read. LocalStorage is Raycast's encrypted per-extension store. So anything derived from the user's account
 * or from what they typed goes to LocalStorage, and only public reference data goes to the Cache.
 */
const cache = new Cache({ namespace: "namecheap-domains" });

/**
 * Namecheap asks API users to cache pricing, but the response is account-specific: the parser reads
 * `YourPrice`, which reflects that account's tier. Cached under the scope so switching credentials cannot
 * quote the previous account's prices.
 */
const PRICING_TTL_MS = 24 * 60 * 60 * 1000;
const pricingKey = (scope: string) => `pricing:${scope}`;

interface Stamped<T> {
  at: number;
  value: T;
}

export function readPricing(scope: string): PricingTable | undefined {
  const raw = cache.get(pricingKey(scope));
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as Stamped<PricingTable>;
    if (typeof entry?.at !== "number" || Date.now() - entry.at > PRICING_TTL_MS) return undefined;
    return entry.value;
  } catch {
    return undefined;
  }
}

export function writePricing(scope: string, value: PricingTable): void {
  cache.set(pricingKey(scope), JSON.stringify({ at: Date.now(), value } satisfies Stamped<PricingTable>));
}

export function clearPricing(scope: string): void {
  cache.remove(pricingKey(scope));
}

/**
 * The user's own public IP. Encrypted, because it locates them, and kept only long enough to save repeating
 * the lookup. Keyed by environment because the two whitelists are separate.
 */
const CLIENT_IP_TTL_MS = 60 * 60 * 1000;
const clientIpKey = (environment: string) => `client-ip:${environment}`;

export async function readClientIp(environment: string): Promise<string | undefined> {
  const raw = await LocalStorage.getItem<string>(clientIpKey(environment));
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as Stamped<string>;
    if (typeof entry?.at !== "number" || Date.now() - entry.at > CLIENT_IP_TTL_MS) return undefined;
    return entry.value;
  } catch {
    return undefined;
  }
}

export async function writeClientIp(environment: string, ip: string): Promise<void> {
  await LocalStorage.setItem(clientIpKey(environment), JSON.stringify({ at: Date.now(), value: ip }));
}

/**
 * The last domain list that loaded, so the command can still show something when a refresh fails. This is the
 * user's own portfolio, so it is encrypted, never written to the plaintext cache, and scoped to the account
 * that fetched it: pointing the extension at a different account must never surface the previous one's domains.
 */
const snapshotKey = (scope: string, listType: DomainListType) => `domains:${scope}:${listType}`;

export interface DomainSnapshot {
  domains: Domain[];
  at: number;
}

export async function readDomainSnapshot(scope: string, listType: DomainListType): Promise<DomainSnapshot | undefined> {
  const raw = await LocalStorage.getItem<string>(snapshotKey(scope, listType));
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as Stamped<Domain[]>;
    if (typeof entry?.at !== "number" || !Array.isArray(entry.value)) return undefined;
    return { domains: entry.value, at: entry.at };
  } catch {
    return undefined;
  }
}

export async function writeDomainSnapshot(scope: string, listType: DomainListType, domains: Domain[]): Promise<void> {
  await LocalStorage.setItem(snapshotKey(scope, listType), JSON.stringify({ at: Date.now(), value: domains }));
}

/** Removes everything this extension has stored: the encrypted store and the public pricing cache. */
export async function clearStoredData(): Promise<void> {
  await LocalStorage.clear();
  cache.clear();
}
