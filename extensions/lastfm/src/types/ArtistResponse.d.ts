export interface ArtistResponse {
  message?: string;
  error?: number;
  topartists: Topartists;
}

export interface Topartists {
  artist: Artist[];
}

export interface Artist {
  streamable: string;
  image: Image[];
  mbid: string;
  url: string;
  playcount: string;
  name: string;
}

export interface Image {
  size: string;
  "#text": string;
}
