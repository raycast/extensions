import { Adapter, MetadataType, SearchResult } from "../@types/global";

export const platformTitles: Record<Adapter, string> = {
  [Adapter.Spotify]: "Spotify",
  [Adapter.YouTube]: "YouTube Music",
  [Adapter.AppleMusic]: "Apple Music",
  [Adapter.SoundCloud]: "SoundCloud",
  [Adapter.Deezer]: "Deezer",
  [Adapter.Tidal]: "Tidal",
  [Adapter.Qobuz]: "Qobuz",
  [Adapter.Bandcamp]: "Bandcamp",
  [Adapter.Pandora]: "Pandora",
};

export function isAdapter(value: unknown): value is Adapter {
  return Object.values(Adapter).some((adapter) => adapter === value);
}

export function getPlatformTitle(value: string): string {
  return isAdapter(value) ? platformTitles[value] : value;
}

const MUSIC_HOSTS = [
  "spotify.com",
  "spotify.link",
  "youtube.com",
  "youtu.be",
  "music.apple.com",
  "itunes.apple.com",
  "deezer.com",
  "dzr.page.link",
  "soundcloud.com",
  "tidal.com",
  "qobuz.com",
  "bandcamp.com",
  "pandora.com",
];

export function isLinkValid(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
  } catch {
    return false;
  }
}

function matchesHost(hostname: string, host: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  return normalized === host || normalized.endsWith(`.${host}`);
}

/** Clipboard auto-conversion only. User-typed links and service responses use isLinkValid. */
export function isKnownMusicLink(value: string, instanceUrl?: string): boolean {
  if (!isLinkValid(value)) return false;
  const { hostname } = new URL(value.trim());
  if (MUSIC_HOSTS.some((host) => matchesHost(hostname, host))) return true;
  if (!instanceUrl) return false;
  try {
    return matchesHost(hostname, new URL(instanceUrl).hostname);
  } catch {
    return false;
  }
}

export function getUniversalUrl(value: string, siteUrl: string): string {
  if (isLinkValid(value)) return value.trim();
  const url = new URL(siteUrl);
  url.searchParams.set("id", value);
  return url.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMetadataType(value: unknown): value is MetadataType {
  return Object.values(MetadataType).some((type) => type === value);
}

/** Validate and copy the service response before it reaches the UI or AI tools. */
export function parseSearchResult(value: unknown): SearchResult {
  const invalidResponse = () =>
    new Error("The conversion service returned an invalid response. Please try again later.");
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !isMetadataType(value.type) ||
    typeof value.title !== "string" ||
    !value.title.trim() ||
    typeof value.description !== "string" ||
    typeof value.source !== "string" ||
    typeof value.universalLink !== "string" ||
    !value.universalLink.trim() ||
    !Array.isArray(value.links)
  ) {
    throw invalidResponse();
  }

  const links: SearchResult["links"] = [];
  for (const link of value.links) {
    if (!isRecord(link)) throw invalidResponse();
    if (link.notAvailable === true) continue;
    if (
      typeof link.type !== "string" ||
      !link.type.trim() ||
      typeof link.url !== "string" ||
      !isLinkValid(link.url) ||
      (link.isVerified !== undefined && typeof link.isVerified !== "boolean")
    ) {
      throw invalidResponse();
    }
    links.push({ type: link.type, url: link.url.trim(), isVerified: link.isVerified });
  }

  return {
    id: value.id,
    type: value.type,
    title: value.title,
    description: value.description,
    source: value.source,
    universalLink: value.universalLink,
    image: typeof value.image === "string" && isLinkValid(value.image) ? value.image : undefined,
    audio: typeof value.audio === "string" && isLinkValid(value.audio) ? value.audio : undefined,
    links,
  };
}
