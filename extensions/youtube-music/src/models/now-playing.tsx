// Info types for now playing content

export type PlatformType = "music" | "youtube";
export type UIScreenType = "song" | "video";

interface MediaControls {
  platform: PlatformType;
  title: string;
  duration: string; // total duration (mm:ss)
  currentTime: string; // current time (mm:ss)
  isMuted: boolean;
  volume: string;
  isPlaying: boolean;
  isLiked: boolean;
  isDisliked: boolean;
  coverUrl: string;
}

export interface SongInfo extends MediaControls {
  uiScreen: "song";
  artist: string;
  album: string;
  year: string;
}

export interface VideoInfo extends MediaControls {
  uiScreen: "video";
  channel: string;
  views: string;
  likes: string;
}

export type ContentInfo = SongInfo | VideoInfo;
