import type { Grid, List } from "@raycast/api";

export type periodTypes = "7day" | "1month" | "3month" | "6month" | "12month" | "overall";

export interface ExtensionPreferences {
  username: string;
  apikey: string;
  period?: periodTypes;
  limit?: string;
  view: "list" | "grid";
}

export type ImageSizes = "small" | "medium" | "large" | "extralarge";

export interface Image {
  size: ImageSizes;
  "#text": string;
}

export interface Artist {
  url: string;
  name: string;
  mbid?: string; 
  image?: Image[];
  playcount?: string;
  streamable?: string;
  "#text"?: string; // For cases where artist is just a string in RecentTracks
}

// Album Types
export interface AlbumResponse {
  message?: string;
  error?: number;
  topalbums: {
    album: Album[];
  };
}

export interface Album {
  artist: Artist;
  image: Image[];
  mbid: string;
  url: string;
  playcount: string;
  name: string;
}


export interface ArtistResponse {
  message?: string;
  error?: number;
  topartists: {
    artist: Artist[];
  };
}

// Song Types
export interface SongResponse {
  message?: string;
  error?: number;
  recenttracks?: {
    track: Track[];
  };
  toptracks?: {
    track: TopTrack[];
  };
}

export interface Track {
  artist: Artist; // Using the consolidated Artist type
  image: Image[];
  album: {
    artist: string; // This seems to be a string in recent tracks
    title: string;
    mbid?: string;
    url?: string;
  };
  name: string;
  "@attr"?: {
    nowplaying: string;
  };
  url: string;
  date?: {
    uts: string;
    "#text": string;
  };
  playcount?: string;
}

export interface TopTrack {
  name: string;
  image: Image[];
  artist: Artist;
  url: string;
  duration: string;
  playcount: string;
}

export type LastFmMethod = "user.getrecenttracks" | "user.gettoptracks" | "user.gettopalbums" | "user.gettopartists";

export interface UseLastFmResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  revalidate: () => void;
}

export type LastFmParams = Record<string, any>;

export interface ItemProps {
  key: string;
  cover: string;
  title: string;
  subtitle?: string;
  accessories?: List.Item.Accessory[];
  accessory?: Grid.Item.Accessory;
  actions?: React.ReactNode;
}

export interface ResultItemProps {
  items: ItemProps[];
}
