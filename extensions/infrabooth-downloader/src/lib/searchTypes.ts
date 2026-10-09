import { Icon, type Image } from "@raycast/api";
import type { RemoteTrack } from "../shared/remote-protocol";
import { searchPlaylists, searchTracks } from "./api";
import type { LibraryPlaylist, Mix } from "./mapping";

export type Results =
  | { kind: "tracks"; tracks: RemoteTrack[] }
  | { kind: "playlists"; playlists: LibraryPlaylist[] }
  | { kind: "mixes"; mixes: Mix[] };

export type SearchType = "tracks" | "playlists" | "mixes" | "online";
export type LibrarySearchType = Exclude<SearchType, "online">;

export const SEARCH_TYPE_ORDER: SearchType[] = ["tracks", "playlists", "mixes", "online"];

interface SearchTypeConfig {
  title: string;
  icon: Image.ImageLike;
  libraryTitle?: string;
  placeholder: string;
  search?: (query: string) => Promise<Results>;
}

export const SEARCH_TYPES: Record<SearchType, SearchTypeConfig> = {
  tracks: {
    title: "Liked Tracks",
    icon: Icon.Music,
    libraryTitle: "Liked Tracks",
    placeholder: "Search tracks…",
    search: async (query) => ({ kind: "tracks", tracks: await searchTracks(query) }),
  },
  playlists: {
    title: "Playlists",
    icon: Icon.List,
    libraryTitle: "Your Playlists",
    placeholder: "Search playlists…",
    search: async (query) => ({ kind: "playlists", playlists: await searchPlaylists(query) }),
  },
  mixes: {
    title: "Mixed for you",
    icon: Icon.Shuffle,
    libraryTitle: "Mixed for you",
    placeholder: "Filter your mixes…",
  },
  online: {
    title: "Search Online",
    icon: Icon.Globe,
    placeholder: "Search SoundCloud or paste a link…",
  },
};

export const SWITCH_TYPE_HINT = "⌘T";

export function nextSearchType(current: SearchType): SearchType {
  return SEARCH_TYPE_ORDER[(SEARCH_TYPE_ORDER.indexOf(current) + 1) % SEARCH_TYPE_ORDER.length];
}

export async function fetchSearch(type: SearchType, query: string): Promise<Results | undefined> {
  return SEARCH_TYPES[type].search?.(query);
}

function matches(query: string, ...fields: string[]): boolean {
  const needle = query.toLowerCase();
  return fields.some((field) => field.toLowerCase().includes(needle));
}

export function withoutLibraryPlaylists(
  results: Results | undefined,
  library: Results | undefined,
): Results | undefined {
  if (results?.kind !== "playlists" || library?.kind !== "playlists") return results;
  const libraryIds = new Set(library.playlists.map((playlist) => playlist.id));
  return { kind: "playlists", playlists: results.playlists.filter((playlist) => !libraryIds.has(playlist.id)) };
}

export function filterResults(results: Results, query: string): Results {
  if (query === "") return results;
  switch (results.kind) {
    case "tracks":
      return { kind: "tracks", tracks: results.tracks.filter((t) => matches(query, t.title, t.artist)) };
    case "playlists":
      return { kind: "playlists", playlists: results.playlists.filter((p) => matches(query, p.title, p.username)) };
    case "mixes":
      return { kind: "mixes", mixes: results.mixes.filter((m) => matches(query, m.title)) };
  }
}
