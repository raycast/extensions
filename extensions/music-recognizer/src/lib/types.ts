export interface RecognizedTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  year?: string;
  coverUrl?: string;
  /** Provider's own page for the track, when it publishes one. */
  songUrl?: string;
  /** Web link: works whether or not the desktop app is installed. */
  spotifyUrl?: string;
  youtubeMusicUrl?: string;
  appleMusicUrl?: string;
  /** Unix epoch milliseconds. */
  recognizedAt: number;
}
