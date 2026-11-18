import { buildOptionsAsync, getActiveModelAsync, getModelLabel } from "./api/mimo-tts";
import { DEFAULT_MODEL, MODEL_LABELS, VOICE_CATEGORIES, getVoicesByCategory } from "./constants/mimo-voices";
import { ProviderReadWithVoice } from "./components/provider-read-with-voice";
import { showTTSFailure } from "./utils/mimo-feedback";
import { chunkText } from "./utils/mimo-text-chunker";
import { playChunksWithLookahead } from "./utils/mimo-pipelined-reading";
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
} from "./utils/mimo-playback-state";
import { getMimoSettings } from "./utils/provider-settings";

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
        getKeywords: (voice) => [voice.name, voice.id, voice.language, voice.category, voice.description],
        getModelLabel,
        getSettings: getMimoSettings,
        getVoicesByCategory,
        modelLabels: MODEL_LABELS,
        navigationTitle: "Read with Selected Voice",
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
        provider: "mimo",
        providerLabel: "MiMo TTS",
        rateSetting: (settings) => settings.speechRate,
        searchBarPlaceholder: "Search MiMo voices...",
        showTTSFailure,
        voiceMetadata: (voice) => [{ title: "Language", text: voice.language }],
      }}
    />
  );
}
