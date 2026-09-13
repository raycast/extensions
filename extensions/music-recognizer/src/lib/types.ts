export interface RecognizedTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  coverUrl?: string;
  shazamUrl?: string;
  spotifyUri?: string;
  youtubeMusicUrl?: string;
  appleMusicUrl: string;
  /** Unix epoch milliseconds. */
  recognizedAt: number;
}
