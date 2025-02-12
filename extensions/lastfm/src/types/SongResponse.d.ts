export interface SongResponse {
  message?: string;
  error?: number;
  recenttracks?: RecentTracks;
  toptracks?: TopTracks;
}

// Recent Tracks
export interface RecentTracks {
  track: Track[];
}

export interface Track {
  artist: Artist;
  image: Image[];
  album: Artist;
  name: string;
  "@attr"?: Attr;
  url: string;
  date?: Date;
  playcount?: string;
}

export interface Date {
  uts: string;
  "#text": string;
}

export interface Attr {
  nowplaying: string;
}

export interface Image {
  size: string;
  "#text": string;
}

export interface Artist {
  "#text": string;
}

// Top Tracks
export interface TopTracks {
  track: TopTrack[];
}

export interface TopTrack {
  name: string;
  image: TopTrackImage[];
  artist: TopTrackArtist;
  url: string;
  duration: string;
  playcount: string;
}

export interface TopTrackArtist {
  url: string;
  name: string;
}

export interface TopTrackImage {
  size: string;
  "#text": string;
}
