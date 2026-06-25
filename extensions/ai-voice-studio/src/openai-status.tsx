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
} from "./utils/openai-playback-state";
import { getOpenAISettings } from "./utils/provider-settings";

export default function OpenAIMenuBarStatus() {
  return (
    <ProviderMenuBarStatus
      actions={[
        { title: "Open OpenAI TTS Studio", icon: Icon.Microphone, commandName: "openai-tts-studio" },
        { title: "Read with OpenAI Voice", icon: Icon.SpeakerHigh, commandName: "openai-read-with-voice" },
        { title: "Set OpenAI Quick Read Voice", icon: Icon.Star, commandName: "openai-select-voice" },
      ]}
      getSettings={getOpenAISettings}
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
      tooltip="OpenAI TTS Status"
    />
  );
}
