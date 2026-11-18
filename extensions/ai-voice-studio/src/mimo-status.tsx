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
} from "./utils/mimo-playback-state";
import { getMimoSettings } from "./utils/provider-settings";

export default function MenuBarStatus() {
  return (
    <ProviderMenuBarStatus
      actions={[
        { title: "Open TTS Studio", icon: Icon.Microphone, commandName: "tts-studio" },
        { title: "Read with MiMo Voice", icon: Icon.SpeakerHigh, commandName: "mimo-read-with-voice" },
        { title: "Set MiMo Quick Read Voice", icon: Icon.Star, commandName: "mimo-select-voice" },
      ]}
      getSettings={getMimoSettings}
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
      rateSetting={(settings) => settings.speechRate}
      tooltip="MiMo TTS Status"
    />
  );
}
