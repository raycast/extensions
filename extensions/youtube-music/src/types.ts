import { List, Icon } from "@raycast/api";
import { ComponentProps } from "react";
import {
  ArtistDetailed,
  SongDetailed,
  AlbumDetailed,
  VideoDetailed,
  PlaylistDetailed,
  SearchResult,
} from "ytmusic-api";

export type RecentSearchResultProps = {
  recentSearches: string[];
  sharedProps: ComponentProps<typeof List>;
  revalidateRecentSearch: () => void;
  searchAgain: (search: string) => void;
};

export type SearchCommandProps = {
  searchText: string;
  searchData: {
    tracks: SongDetailed[];
    albums: AlbumDetailed[];
    artists: ArtistDetailed[];
    videos: VideoDetailed[];
    playlists: PlaylistDetailed[];
  };
  searchAgain: (text: string) => Promise<void>;
  recentSearches: string[];
  revalidateRecentSearch: () => void;
  onSearchFilterChange: (newValue: string) => void;
  sharedProps: ComponentProps<typeof List>;
};

export type SearchDropdownProps = {
  onSearchFilterChange: (newValue: string) => void;
};

export type SearchDropdownList = {
  title: string;
  value: string;
};

export type SearchResponse<T extends SearchDropdownList["value"]> = T extends "artists"
  ? ArtistDetailed[]
  : T extends "songs"
    ? SongDetailed[]
    : T extends "albums"
      ? AlbumDetailed[]
      : T extends "videos"
        ? VideoDetailed[]
        : T extends "playlists"
          ? PlaylistDetailed[]
          : SearchResult[];

export type ActionTypeProps = {
  title: string;
  url: string;
  replaceTab?: boolean;
  icon?: Icon;
};

// replace browser tab feature

export type SupportedBrowsers = "Safari" | "Chrome" | "YouTube Music" | "Microsoft Edge";

export interface OsaError {
  stderr: string;
}
