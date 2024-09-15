export const API_URL = "http://localhost:9863/api/v1";

export const COMMANDS = {
  PLAY_PAUSE: "playPause",
  PLAY: "play",
  PAUSE: "pause",
  VOLUME_UP: "volumeUp",
  VOLUME_DOWN: "volumeDown",
  NEXT: "next",
  PREVIOUS: "previous",
  LIKE: "toggleLike",
  DISLIKE: "toggleDislike",
  SHUFFLE: "shuffle",
  SEEK_TO: "seekTo",
  REPEAT_MODE: "repeatMode",
  MUTE: "mute",
  UNMUTE: "unmute",
  SET_VOLUME: "setVolume",
};

export const COMMAND_NOTIFICATIONS_MAP = {
  [COMMANDS.PLAY_PAUSE]: "Play/Pause",
  [COMMANDS.PLAY]: "Play",
  [COMMANDS.PAUSE]: "Pause",
  [COMMANDS.VOLUME_UP]: "Volume Up",
  [COMMANDS.VOLUME_DOWN]: "Volume Down",
  [COMMANDS.NEXT]: "Next",
  [COMMANDS.PREVIOUS]: "Previous",
  [COMMANDS.LIKE]: "Liked Track",
  [COMMANDS.DISLIKE]: "Disliked Track",
  [COMMANDS.SHUFFLE]: "Shuffled Playlist",
  [COMMANDS.SEEK_TO]: "Seeked to Position",
  [COMMANDS.REPEAT_MODE]: "Repeat Mode set",
  [COMMANDS.MUTE]: "Muted",
  [COMMANDS.UNMUTE]: "Unmuted",
  [COMMANDS.SET_VOLUME]: "Volume set",
};

export enum RepeatMode {
  NONE = "0",
  ALL = "1",
  ONE = "2",
}

export const APP = {
  APP_ID: "raycastytmdesktop",
  APP_NAME: "raycastytmdesktop",
  APP_VERSION: "1.0.0",
  BUNDLE_ID: "com.electron.youtube-music-desktop-app",
  DOWNLOAD_URL: "https://ytmdesktop.app",
};

export const API_ENDPOINTS = {
  COMMAND: "/command",
  CODE_REQUEST: "/auth/requestcode",
  TOKEN_REQUEST: "/auth/request",
};
