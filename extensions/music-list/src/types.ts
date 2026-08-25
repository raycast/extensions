export interface Song {
  author: string;
  title: string;
  album: string;
  path: string;
  duration: number;
  format: string;
}
export interface Preferences {
  musicFolder?: string;
  audioExtensions: string;
}
export interface CachedPayload {
  songs: Song[];
  savedAt: number;
}
