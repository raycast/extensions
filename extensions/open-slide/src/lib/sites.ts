import { LocalStorage } from "@raycast/api";
import type { Site } from "./types";

// The stored key predates the rename to "site" and is left alone so an
// upgrade does not drop the URLs someone already added.
const KEY = "deployments";

/**
 * Accepts what people actually paste: a bare host, a trailing slash, a deck
 * URL. Keeps the path, since `open-slide.config.ts` supports subpath hosting.
 */
export function normalizeBase(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter a URL");
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error("That doesn't look like a valid URL");
  }
  if (!url.hostname.includes(".") && url.hostname !== "localhost") {
    throw new Error("That doesn't look like a valid URL");
  }

  // `https://site.com/s/my-deck` → `https://site.com`
  const path = url.pathname.replace(/\/s\/[^/]+(?:\/presenter)?\/?$/, "").replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

export function defaultLabel(base: string): string {
  const url = new URL(base);
  return url.pathname.length > 1 ? `${url.hostname}${url.pathname}` : url.hostname;
}

export async function listSites(): Promise<Site[]> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Site[]) : [];
  } catch {
    return [];
  }
}

async function save(sites: Site[]): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(sites));
}

export async function addSite(base: string, label?: string): Promise<Site> {
  const sites = await listSites();
  if (sites.some((d) => d.base === base)) {
    throw new Error("That site has already been added");
  }
  const site: Site = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    base,
    label: label?.trim() || defaultLabel(base),
    addedAt: Date.now(),
  };
  await save([...sites, site]);
  return site;
}

export async function removeSite(id: string): Promise<void> {
  await save((await listSites()).filter((d) => d.id !== id));
}

export async function renameSite(id: string, label: string): Promise<void> {
  const sites = await listSites();
  await save(sites.map((d) => (d.id === id ? { ...d, label: label.trim() || d.label } : d)));
}
