import { Icon } from "@raycast/api";
import { ProviderMenuBarStatus } from "./components/provider-menu-bar-status";
import {
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  clearNowPlaying,
  clearSpeedOverride,
  formatSpeed,
  getNowPlaying,
  getSpeedOverride,
  parseRateString,
  requestPlaybackStop,
  setSpeedOverride,
} from "./utils/qwen-playback-state";
import { getQwenSettings } from "./utils/provider-settings";

export default function QwenTTSMenuBarStatus() {
  return (
    <ProviderMenuBarStatus
      actions={[
        { title: "Read with Qwen-TTS Voice", icon: Icon.SpeakerHigh, commandName: "qwen-read-with-voice" },
        { title: "Set Qwen-TTS Quick Read Voice", icon: Icon.Star, commandName: "qwen-select-voice" },
      ]}
      getSettings={getQwenSettings}
      playback={{
        clearNowPlaying,
        clearSpeedOverride,
        formatSpeed,
        getNowPlaying,
        getSpeedOverride,
        parseRateString,
        requestPlaybackStop,
        setSpeedOverride,
        speedMax: SPEED_MAX,
        speedMin: SPEED_MIN,
        speedStep: SPEED_STEP,
      }}
      rateSetting={(settings) => settings.playbackRate}
      tooltip="Qwen-TTS Status"
    />
  );
}
