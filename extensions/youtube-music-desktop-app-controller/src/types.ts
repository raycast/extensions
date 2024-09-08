export interface Preferences {
  apiUrl: string;
  authToken: string;
}

export interface PlayerState {
  track: {
    title: string;
    artist: string;
    album: string;
    cover: string;
  };
  isPaused: boolean;
  volume: number;
  repeatMode: string;
  isShuffling: boolean;
  likeStatus: string;
  currentTime: number;
  duration: number;
}
export interface ApiErrorResponse {
  error: boolean;
  message: string;
}
