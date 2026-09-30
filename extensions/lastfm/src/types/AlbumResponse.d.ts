export interface AlbumResponse {
  message?: string;
  error?: number;
  topalbums: TopAlbums;
}

export interface TopAlbums {
  album: Album[];
}

export interface Album {
  artist: Artist;
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

export interface Artist {
  url: string;
  name: string;
  mbid: string;
}
