import {
  SPEED_MAX,
  SPEED_MIN,
  SPEED_NORMAL,
  SPEED_STEP,
  createProviderPlaybackState,
  rateToInstruction,
} from "./shared-playback-state";
import type { NowPlayingState, PlaybackStatus } from "./shared-playback-state";

export { SPEED_MAX, SPEED_MIN, SPEED_NORMAL, SPEED_STEP, rateToInstruction };
export type { NowPlayingState, PlaybackStatus };

const playbackState = createProviderPlaybackState("mimo-tts", { parseLegacyRateOffset: true });

export const {
  getNowPlaying,
  setNowPlaying,
  isNowPlayingFresh,
  patchNowPlaying,
  clearNowPlaying,
  markIdle,
  markError,
  requestPlaybackStop,
  clearPlaybackStopRequest,
  hasPlaybackStopRequest,
  getSpeedOverride,
  setSpeedOverride,
  clearSpeedOverride,
  adjustSpeed,
  clampSpeed,
  roundToStep,
  parseRateString,
  formatSpeed,
} = playbackState;
