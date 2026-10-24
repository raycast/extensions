import { buildOptionsAsync, getActiveModelAsync, getModelLabel, synthesizeSpeech } from "./api/mimo-tts";
import { DEFAULT_MODEL, VOICE_CATEGORIES, getVoiceById, getVoicesByCategory } from "./constants/mimo-voices";
import { ProviderSelectVoice } from "./components/provider-select-voice";
import { showTTSFailure } from "./utils/mimo-feedback";
import { clearPlaybackStopRequest } from "./utils/mimo-playback-state";
import { getPreviewText } from "./utils/mimo-text-source";
import {
  clearQuickReadVoiceOverride,
  getActiveQuickReadVoiceId,
  setQuickReadVoiceOverride,
} from "./utils/mimo-voice-preferences";

export default function SelectVoice() {
  return (
    <ProviderSelectVoice
      config={{
        buildOptions: buildOptionsAsync,
        categories: VOICE_CATEGORIES,
        clearPlaybackStopRequest,
        clearQuickReadVoiceOverride,
        defaultModel: DEFAULT_MODEL,
        fallbackPreviewText: "This is a short MiMo TTS voice preview.",
        getActiveModel: getActiveModelAsync,
        getActiveQuickReadVoiceId,
        getKeywords: (voice) => [voice.id, voice.language, voice.category],
        getModelLabel,
        getPreviewText,
        getVoiceById,
        getVoicesByCategory,
        navigationTitle: "Set Quick Read Voice",
        provider: "mimo",
        searchBarPlaceholder: "Search MiMo voices...",
        setQuickReadVoiceOverride,
        showTTSFailure,
        synthesizeSpeech,
        voiceMetadata: (voice) => [{ title: "Language", text: voice.language }],
      }}
    />
  );
}
