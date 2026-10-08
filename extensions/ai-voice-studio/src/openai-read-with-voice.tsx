import { buildOptionsAsync, getActiveModelAsync, getModelLabel } from "./api/openai-tts";
import { DEFAULT_MODEL, MODEL_LABELS, VOICE_CATEGORIES, getVoicesByCategory } from "./constants/openai-voices";
import { ProviderReadWithVoice } from "./components/provider-read-with-voice";
import { showTTSFailure } from "./utils/openai-feedback";
import { chunkText } from "./utils/openai-text-chunker";
import { playChunksWithLookahead } from "./utils/openai-pipelined-reading";
import {
  clearNowPlaying,
  clearPlaybackStopRequest,
  formatSpeed,
  getSpeedOverride,
  markError,
  markIdle,
  parseRateString,
  patchNowPlaying,
  requestPlaybackStop,
  setNowPlaying,
  setSpeedOverride,
  SPEED_STEP,
} from "./utils/openai-playback-state";
import { getOpenAISettings } from "./utils/provider-settings";

export default function ReadWithVoice() {
  return (
    <ProviderReadWithVoice
      config={{
        buildOptions: buildOptionsAsync,
        categories: VOICE_CATEGORIES,
        chunkText,
        defaultModel: DEFAULT_MODEL,
        emptyDescription: (modelLabel) =>
          `Try another search term or change the model in Setup Voice Defaults. Current model: ${modelLabel}`,
        getActiveModel: getActiveModelAsync,
        getKeywords: (voice) => [voice.name, voice.id, voice.category, voice.description],
        getModelLabel,
        getSettings: getOpenAISettings,
        getVoicesByCategory,
        modelLabels: MODEL_LABELS,
        navigationTitle: "Read with OpenAI Voice",
        playback: {
          clearNowPlaying,
          clearPlaybackStopRequest,
          formatSpeed,
          getSpeedOverride,
          markError,
          markIdle,
          parseRateString,
          patchNowPlaying,
          requestPlaybackStop,
          setNowPlaying,
          setSpeedOverride,
          speedStep: SPEED_STEP,
        },
        playChunksWithLookahead,
        provider: "openai",
        providerLabel: "OpenAI Speech API",
        rateSetting: (settings) => settings.playbackRate,
        searchBarPlaceholder: "Search OpenAI voices...",
        showTTSFailure,
      }}
    />
  );
}
