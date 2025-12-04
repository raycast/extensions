export enum Adapter {
  Spotify = "spotify",
  YouTube = "youTube",
  AppleMusic = "appleMusic",
  SoundCloud = "soundCloud",
  Deezer = "deezer",
  Tidal = "tidal",
}

export enum MetadataType {
  Song = "song",
  Album = "album",
  Playlist = "playlist",
  Artist = "artist",
  Podcast = "podcast",
  Show = "show",
}

export type SearchMetadata = {
  title: string;
  description: string;
  type: MetadataType;
  image: string;
  audio?: string;
};

export type SearchResultLink = {
  type: Adapter;
  url: string;
  isVerified?: boolean;
};

export type SearchResult = {
  id: string;
  type: MetadataType;
  title: string;
  description: string;
  image: string;
  audio?: string;
  source: string;
  universalLink: string;
  links: SearchResultLink[];
};

export type CacheData = {
  link: string;
  searchResult: SearchResult;
};

export interface ApiError {
  code: string;
  message: string;
}
