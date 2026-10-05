import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

const STORAGE_KEY = "profile-links";

export interface ProfileLink {
  id: string;
  title: string;
  url: string;
  /** Chrome profile directory. `undefined` means "ask every time". */
  profileDirectory?: string;
  tags?: string[];
  createdAt: number;
}

export type ProfileLinkInput = Pick<ProfileLink, "title" | "url" | "profileDirectory" | "tags">;

export async function getProfileLinks(): Promise<ProfileLink[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as ProfileLink[]) : [];
}

async function saveProfileLinks(links: ProfileLink[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

export async function getProfileLink(id: string): Promise<ProfileLink | undefined> {
  return (await getProfileLinks()).find((link) => link.id === id);
}

export async function addProfileLink(input: ProfileLinkInput): Promise<ProfileLink> {
  const link: ProfileLink = { ...input, id: randomUUID(), createdAt: Date.now() };
  await saveProfileLinks([...(await getProfileLinks()), link]);
  return link;
}

export async function updateProfileLink(id: string, input: ProfileLinkInput): Promise<void> {
  const links = await getProfileLinks();
  await saveProfileLinks(links.map((link) => (link.id === id ? { ...link, ...input } : link)));
}

export async function deleteProfileLink(id: string): Promise<void> {
  const links = await getProfileLinks();
  await saveProfileLinks(links.filter((link) => link.id !== id));
}

/** Adds `https://` when the user omits the scheme, e.g. "github.com". */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  return /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(normalizeUrl(input));
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:";
  } catch {
    return false;
  }
}

export function defaultTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Parses "work, docs  ,work" into ["work", "docs"]. */
export function parseTags(input: string): string[] {
  return [
    ...new Set(
      input
        .split(/[,、]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

/** Treats "https://example.com" and "https://example.com/" as the same URL. */
function comparableUrl(url: string): string {
  return url.replace(/\/+$/, "").toLowerCase();
}

/** Finds another saved link that opens the same URL in the same profile. */
export async function findDuplicateLink(input: ProfileLinkInput, excludeId?: string): Promise<ProfileLink | undefined> {
  const target = comparableUrl(input.url);
  return (await getProfileLinks()).find(
    (link) =>
      link.id !== excludeId && comparableUrl(link.url) === target && link.profileDirectory === input.profileDirectory,
  );
}
