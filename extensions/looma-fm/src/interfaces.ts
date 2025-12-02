export interface MusicTrack {
  name: string;
  url: string;
  size: number;
  path: string;
}

export interface PlaybackState {
  currentTrack?: {
    name: string;
    url: string;
    path: string;
  };
  isPlaying: boolean;
  isPaused: boolean;
  tempFilePath?: string;
  pid?: number;
}
export interface MeditationTrack {
  name: string;
  url: string;
  size: number;
  path: string;
}
