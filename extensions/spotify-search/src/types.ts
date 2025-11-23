export interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{
    id: string;
    name: string;
  }>;
  album: {
    id: string;
    name: string;
    images: Array<{
      url: string;
      height: number;
      width: number;
    }>;
  };
  external_urls: {
    spotify: string;
  };
  duration_ms: number;
  preview_url: string | null;
  popularity: number;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: {
    id: string;
    display_name: string | null;
  } | null;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
  tracks: {
    total: number;
  };
  description: string | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  external_urls: {
    spotify: string;
  };
  followers: {
    total: number;
  };
  genres: string[];
}

export interface SearchResults {
  tracks: {
    items: SpotifyTrack[];
  };
  playlists: {
    items: (SpotifyPlaylist | null)[];
  };
  artists: {
    items: SpotifyArtist[];
  };
}
