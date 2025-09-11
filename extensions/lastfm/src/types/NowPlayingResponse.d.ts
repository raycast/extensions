export interface NowPlayingTrack {
  name: string;
  artist: string;
  album?: string;
  duration?: number;
  mbid?: string; // MusicBrainz ID
}

export interface NowPlayingResponse {
  nowplaying: {
    artist: {
      corrected: string;
      "#text": string;
    };
    album?: {
      corrected: string;
      "#text": string;
    };
    albumArtist?: {
      corrected: string;
      "#text": string;
    };
    track: {
      corrected: string;
      "#text": string;
    };
    ignoredMessage?: {
      code: string;
      "#text": string;
    };
  };
}

export interface NowPlayingErrorResponse {
  error: number;
  message: string;
}
