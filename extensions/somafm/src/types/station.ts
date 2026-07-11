export interface Playlist {
  url: string;
  format: string;
  quality: string;
}

export interface Station {
  id: string;
  title: string;
  description: string;
  dj: string;
  genre: string;
  image: string;
  largeimage: string;
  xlimage: string;
  twitter?: string;
  updated: string;
  playlists: Playlist[];
  listeners: string;
  lastPlaying?: string;
}

export interface ChannelsResponse {
  channels: Station[];
}
