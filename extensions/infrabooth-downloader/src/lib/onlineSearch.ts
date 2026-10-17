import type { RemoteTrack } from "../shared/remote-protocol";
import { searchAlbums, searchPlaylists, searchTracks, type SearchPage } from "./api";
import type { LibraryPlaylist } from "./mapping";
import type { Results } from "./searchTypes";

export type PlaylistKind = "playlists" | "albums";
export type OnlineKind = "tracks" | PlaylistKind;

export interface OnlineSearchResults {
  tracks: RemoteTrack[];
  playlists: LibraryPlaylist[];
  albums: LibraryPlaylist[];
}

export interface OnlineSection {
  kind: OnlineKind;
  title: string;
  results: Results;
  showAll: boolean;
}

export interface Page<T> {
  data: T[];
  hasMore: boolean;
}

export const ONLINE_PREVIEW_LIMIT = 3;
export const SHOW_ALL_PAGE_SIZE = 20;

const ONLINE_KINDS: OnlineKind[] = ["tracks", "playlists", "albums"];

export const ONLINE_KIND_TITLES: Record<OnlineKind, string> = {
  tracks: "Tracks",
  playlists: "Playlists",
  albums: "Albums",
};

export interface OnlineItems {
  tracks: RemoteTrack;
  playlists: LibraryPlaylist;
  albums: LibraryPlaylist;
}

export const ONLINE_SEARCHES: { [K in OnlineKind]: (query: string, page?: SearchPage) => Promise<OnlineItems[K][]> } = {
  tracks: searchTracks,
  playlists: searchPlaylists,
  albums: searchAlbums,
};

export function isFullPage(count: number, pageSize: number): boolean {
  return count >= pageSize;
}

export async function fetchOnlineResults(query: string): Promise<OnlineSearchResults> {
  const page = { limit: ONLINE_PREVIEW_LIMIT, offset: 0 };
  const [tracks, playlists, albums] = await Promise.all([
    searchTracks(query, page),
    searchPlaylists(query, page),
    searchAlbums(query, page),
  ]);
  return { tracks, playlists, albums };
}

function sectionResults(results: OnlineSearchResults, kind: OnlineKind): Results {
  return kind === "tracks"
    ? { kind: "tracks", tracks: results.tracks }
    : { kind: "playlists", playlists: results[kind] };
}

export function onlineSections(results: OnlineSearchResults): OnlineSection[] {
  return ONLINE_KINDS.filter((kind) => results[kind].length > 0).map((kind) => ({
    kind,
    title: ONLINE_KIND_TITLES[kind],
    results: sectionResults(results, kind),
    showAll: isFullPage(results[kind].length, ONLINE_PREVIEW_LIMIT),
  }));
}

export async function loadPage<T>(
  search: (query: string, page: SearchPage) => Promise<T[]>,
  query: string,
  page: number,
): Promise<Page<T>> {
  const data = await search(query, { limit: SHOW_ALL_PAGE_SIZE, offset: page * SHOW_ALL_PAGE_SIZE });
  return { data, hasMore: isFullPage(data.length, SHOW_ALL_PAGE_SIZE) };
}

export function uniqueById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Set<number>();
  return items.filter((item) => !seen.has(item.id) && seen.add(item.id));
}
