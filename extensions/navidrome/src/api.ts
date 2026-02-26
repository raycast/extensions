import { getPreferenceValues } from "@raycast/api";
import md5 from "md5";


export interface Artist {
  id: string;
  name: string;
  albumCount?: number;
  coverArt?: string;
  starred?: string;
}

export interface Album {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  year?: number;
  genre?: string;
  starred?: string;
}

export interface Song {
  id: string;
  title: string;
  album?: string;
  albumId?: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  duration?: number;
  track?: number;
  year?: number;
  genre?: string;
  starred?: string;
}

export interface SearchResult {
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}

function generateSalt(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let salt = "";
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

function getAuthParams(): URLSearchParams {
  const { username, password } = getPreferenceValues<Preferences>();
  const salt = generateSalt();
  const token = md5(password + salt);

  return new URLSearchParams({
    u: username,
    t: token,
    s: salt,
    v: "1.16.1",
    c: "raycast-navidrome",
    f: "json",
  });
}

function getBaseUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  return serverUrl.replace(/\/+$/, "");
}

async function apiCall<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const authParams = getAuthParams();

  for (const [key, value] of Object.entries(params)) {
    authParams.set(key, value);
  }

  const url = `${baseUrl}/rest/${endpoint}?${authParams.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as {
    "subsonic-response": {
      status: string;
      error?: { message: string };
      [key: string]: unknown;
    };
  };
  const subsonicResponse = data["subsonic-response"];

  if (subsonicResponse.status === "failed") {
    const errorMessage = subsonicResponse.error?.message || "Unknown API error";
    throw new Error(`Navidrome API error: ${errorMessage}`);
  }

  return subsonicResponse as unknown as T;
}

// The API may return a single object instead of an array when there's only one result
function toArray<T>(val: T | T[] | undefined): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

export async function search3(query: string): Promise<SearchResult> {
  if (!query.trim()) {
    return { artists: [], albums: [], songs: [] };
  }

  const result = await apiCall<{
    searchResult3?: {
      artist?: Artist | Artist[];
      album?: Album | Album[];
      song?: Song | Song[];
    };
  }>("search3", {
    query,
    artistCount: "5",
    albumCount: "10",
    songCount: "10",
  });

  const sr = result.searchResult3 || {};

  return {
    artists: toArray(sr.artist),
    albums: toArray(sr.album),
    songs: toArray(sr.song),
  };
}

export async function getAlbumList(
  type: string,
  size = 25,
  offset = 0,
): Promise<Album[]> {
  const result = await apiCall<{
    albumList2?: {
      album?: Album | Album[];
    };
  }>("getAlbumList2", {
    type,
    size: size.toString(),
    offset: offset.toString(),
  });

  return toArray(result.albumList2?.album);
}

export async function getRecentlyAdded(size = 25): Promise<Album[]> {
  return getAlbumList("newest", size);
}

export async function getMostPlayed(size = 25): Promise<Album[]> {
  return getAlbumList("frequent", size);
}

export function getCoverArtUrl(coverArtId: string, size = 100): string {
  const baseUrl = getBaseUrl();
  const authParams = getAuthParams();
  authParams.set("id", coverArtId);
  authParams.set("size", size.toString());
  return `${baseUrl}/rest/getCoverArt?${authParams.toString()}`;
}

export function getNavidromeWebUrl(
  type: "artist" | "album" | "song",
  id: string,
): string {
  const baseUrl = getBaseUrl();

  switch (type) {
    case "artist":
      return `${baseUrl}/app/#/artist/${id}/show`;
    case "album":
      return `${baseUrl}/app/#/album/${id}/show`;
    case "song":
      return `${baseUrl}/app/#/album/${id}/show`;
    default:
      return baseUrl;
  }
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export async function ping(): Promise<boolean> {
  try {
    await apiCall<{ status: string }>("ping");
    return true;
  } catch {
    return false;
  }
}
