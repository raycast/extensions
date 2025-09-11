export interface ScrobbleTrack {
  name: string;
  artist: string;
  album?: string;
  timestamp: number;
  duration?: number;
  mbid?: string; // MusicBrainz ID
}

export interface ScrobbleResponse {
  scrobbles: {
    "@attr": {
      accepted: number;
      ignored: number;
    };
    scrobble: Array<{
      artist: {
        corrected: string;
        "#text": string;
      };
      ignoredMessage?: {
        code: string;
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
      timestamp: string;
    }>;
  };
}

export interface ScrobbleErrorResponse {
  error: number;
  message: string;
}
