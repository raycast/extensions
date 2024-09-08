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

export enum RepeatMode {
  NONE = "0",
  ALL = "1",
  ONE = "2",
}

export const APP = {
  APP_ID: "raycastytmdesktop",
  APP_NAME: "raycastytmdesktop",
  APP_VERSION: "1.0.0",
};
