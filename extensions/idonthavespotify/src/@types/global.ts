export enum SpotifyMetadataType {
  Song = "music.song",
  Album = "music.album",
  Playlist = "music.playlist",
  Artist = "profile",
  Podcast = "music.episode",
  Show = "website",
}

export enum SpotifyContentLinkType {
  Youtube = "youtube",
  AppleMusic = "appleMusic",
  Tidal = "tidal",
  SoundCloud = "soundCloud",
  Deezer = "deezer",
}

export interface SpotifyContentLink {
  type: SpotifyContentLinkType;
  url: string;
  isVerified?: boolean;
}

export interface SpotifyContent {
  id: string;
  type: SpotifyMetadataType;
  title: string;
  description: string;
  image: string;
  audio?: string;
  source: string;
  links: SpotifyContentLink[];
}

export interface CacheData {
  spotifyLink: string;
  spotifyContent: SpotifyContent;
}

export interface ApiError {
  error: string;
}
