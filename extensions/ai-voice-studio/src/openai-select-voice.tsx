import { buildOptionsAsync, getActiveModelAsync, getModelLabel, synthesizeSpeech } from "./api/openai-tts";
import { DEFAULT_MODEL, VOICE_CATEGORIES, getVoiceById, getVoicesByCategory } from "./constants/openai-voices";
import { ProviderSelectVoice } from "./components/provider-select-voice";
import { showTTSFailure } from "./utils/openai-feedback";
import { clearPlaybackStopRequest } from "./utils/openai-playback-state";
import { getPreviewText } from "./utils/openai-text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/openai-voice-preferences";

export default function SelectVoice() {
  return (
    <ProviderSelectVoice
      config={{
        buildOptions: buildOptionsAsync,
        categories: VOICE_CATEGORIES,
        clearPlaybackStopRequest,
        clearQuickReadVoiceOverride,
        defaultModel: DEFAULT_MODEL,
        fallbackPreviewText: "This is a short OpenAI TTS voice preview.",
        getActiveModel: getActiveModelAsync,
        getActiveQuickReadVoiceId,
        getKeywords: (voice) => [voice.id, voice.category],
        getModelLabel,
        getPreviewText,
        getVoiceById,
        getVoicesByCategory,
        navigationTitle: "Set OpenAI Quick Read Voice",
        provider: "openai",
        searchBarPlaceholder: "Search OpenAI voices...",
        setQuickReadVoiceOverride,
        showTTSFailure,
        synthesizeSpeech,
      }}
    />
  );
}
