export enum SpotifyMetadataType {
  Song = "music.song",
  Album = "music.album",
  Playlist = "music.playlist",
  Artist = "profile",
  Podcast = "music.episode",
  Show = "website",
}

export enum SpotifyContentLink {
  Youtube = "youtube",
  AppleMusic = "appleMusic",
  Tidal = "tidal",
  SoundCloud = "soundCloud",
}

export interface SpotifyContent {
  id: string;
  title: string;
  description: string;
  type: SpotifyMetadataType;
  image: string;
  audio?: string;
  source: string;
  links: {
    [SpotifyContentLink.Youtube]: string;
    [SpotifyContentLink.AppleMusic]: string;
    [SpotifyContentLink.Tidal]: string;
    [SpotifyContentLink.SoundCloud]: string;
  };
}

export interface CacheData {
  spotifyLink: string;
  spotifyContent: SpotifyContent;
}

export interface ApiError {
  error: string;
}
