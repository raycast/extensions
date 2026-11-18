import { buildOptionsAsync, getActiveModelAsync, getModelLabel, synthesizeSpeech } from "./api/qwen-tts";
import {
  DEFAULT_MODEL,
  MODEL_LABELS,
  VOICE_CATEGORIES,
  getVoiceById,
  getVoiceSearchKeywords,
  getVoicesByCategory,
} from "./constants/qwen-tts-voices";
import { ProviderSelectVoice } from "./components/provider-select-voice";
import { showTTSFailure } from "./utils/qwen-feedback";
import { clearPlaybackStopRequest } from "./utils/qwen-playback-state";
import { getPreviewText } from "./utils/qwen-text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/qwen-voice-preferences";

export default function SelectVoice() {
  return (
    <ProviderSelectVoice
      config={{
        buildOptions: buildOptionsAsync,
        categories: VOICE_CATEGORIES,
        clearPlaybackStopRequest,
        clearQuickReadVoiceOverride,
        defaultModel: DEFAULT_MODEL,
        fallbackPreviewText: "This is a short Qwen-TTS voice preview.",
        getActiveModel: getActiveModelAsync,
        getActiveQuickReadVoiceId,
        getKeywords: getVoiceSearchKeywords,
        getModelLabel,
        getPreviewText,
        getVoiceById,
        getVoicesByCategory,
        navigationTitle: "Set Qwen-TTS Quick Read Voice",
        provider: "qwen",
        searchBarPlaceholder: "Search Qwen-TTS voices...",
        setQuickReadVoiceOverride,
        showTTSFailure,
        synthesizeSpeech,
        voiceMetadata: (voice) => [
          { title: "Available On", text: voice.models.map((model) => MODEL_LABELS[model]).join(", ") },
          { title: "Language", text: voice.language },
        ],
      }}
    />
  );
}
