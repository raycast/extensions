import { tryReadJSONPref } from "./plist";

export interface ModelInfo {
  /** camelCase id as stored in `transcriptionModelID` */
  id: string;
  label: string;
  provider: string;
  /** Whether the model runs locally on-device (no API key, offline) */
  local: boolean;
  /** Whether the provider requires the user to have configured an API key */
  requiresAPIKey: boolean;
}

/**
 * Curated registry built from the Spokenly binary's string table. Not
 * exhaustive — regenerate periodically with:
 *
 *   strings /Applications/Spokenly.app/Contents/MacOS/Spokenly | \
 *     grep -iE 'parakeet|whisper|qwen|gpt4o|nova|voxtral|soniox|eleven|appleSpeech|nemotron|cartesia|distil|largeV'
 *
 * Unknown models discovered in `recentDictationModels` are appended at runtime
 * via `getAllKnownModels()` so users on newer builds aren't blocked.
 */
export const MODEL_REGISTRY: ModelInfo[] = [
  // Parakeet (NVIDIA, local)
  {
    id: "parakeetTDT06",
    label: "Parakeet TDT 0.6B",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetTDT06V2",
    label: "Parakeet TDT 0.6B v2",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetV2",
    label: "Parakeet v2",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetV3",
    label: "Parakeet v3",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetCtc06b",
    label: "Parakeet CTC 0.6B",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetCtc110m",
    label: "Parakeet CTC 110M",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetCtcZhCn",
    label: "Parakeet CTC (Chinese)",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "parakeetJa",
    label: "Parakeet (Japanese)",
    provider: "Parakeet",
    local: true,
    requiresAPIKey: false,
  },

  // Whisper distillations (local)
  {
    id: "distilLargeV35",
    label: "Distil Whisper Large v3.5",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "distilMediumEn",
    label: "Distil Whisper Medium (EN)",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "distilSmallEn",
    label: "Distil Whisper Small (EN)",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },

  // Whisper Large family (local)
  {
    id: "largeV2",
    label: "Whisper Large v2",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "largeV3",
    label: "Whisper Large v3",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "largeV3Turbo",
    label: "Whisper Large v3 Turbo",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "largeV3TurboQuantized",
    label: "Whisper Large v3 Turbo (Quantized)",
    provider: "Whisper",
    local: true,
    requiresAPIKey: false,
  },

  // Qwen ASR (local)
  {
    id: "qwen3Asr",
    label: "Qwen 3 ASR",
    provider: "Qwen",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "qwen3AsrInt8",
    label: "Qwen 3 ASR (INT8)",
    provider: "Qwen",
    local: true,
    requiresAPIKey: false,
  },

  // Voxtral (local)
  {
    id: "voxtralMini",
    label: "Voxtral Mini",
    provider: "Mistral",
    local: true,
    requiresAPIKey: false,
  },

  // Apple Speech (local, system)
  {
    id: "appleSpeechAnalyzer",
    label: "Apple Speech Analyzer",
    provider: "Apple",
    local: true,
    requiresAPIKey: false,
  },
  {
    id: "appleSpeechTranscriber",
    label: "Apple Speech Transcriber",
    provider: "Apple",
    local: true,
    requiresAPIKey: false,
  },

  // Cloud — OpenAI
  {
    id: "gpt4oMini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "gpt4oMiniTranscribe",
    label: "GPT-4o Mini Transcribe",
    provider: "OpenAI",
    local: false,
    requiresAPIKey: true,
  },

  // Cloud — Deepgram
  {
    id: "nova3",
    label: "Deepgram Nova 3",
    provider: "Deepgram",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "nova3English",
    label: "Deepgram Nova 3 (English)",
    provider: "Deepgram",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "nova3Medical",
    label: "Deepgram Nova 3 (Medical)",
    provider: "Deepgram",
    local: false,
    requiresAPIKey: true,
  },

  // Cloud — ElevenLabs
  {
    id: "elevenLabsScribe",
    label: "ElevenLabs Scribe",
    provider: "ElevenLabs",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "elevenLabsStreaming",
    label: "ElevenLabs Streaming",
    provider: "ElevenLabs",
    local: false,
    requiresAPIKey: true,
  },

  // Cloud — Soniox
  {
    id: "sonioxAsync",
    label: "Soniox (Async)",
    provider: "Soniox",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "sonioxRealtime",
    label: "Soniox (Realtime)",
    provider: "Soniox",
    local: false,
    requiresAPIKey: true,
  },

  // Cloud — Cartesia
  {
    id: "cartesiaInkStreaming",
    label: "Cartesia Ink Streaming",
    provider: "Cartesia",
    local: false,
    requiresAPIKey: true,
  },

  // Cloud — Nemotron
  {
    id: "nemotronStreaming80",
    label: "Nemotron Streaming 80M",
    provider: "NVIDIA",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "nemotronStreaming160",
    label: "Nemotron Streaming 160M",
    provider: "NVIDIA",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "nemotronStreaming560",
    label: "Nemotron Streaming 560M",
    provider: "NVIDIA",
    local: false,
    requiresAPIKey: true,
  },
  {
    id: "nemotronStreaming1120",
    label: "Nemotron Streaming 1.1B",
    provider: "NVIDIA",
    local: false,
    requiresAPIKey: true,
  },
];

interface RecentDictationModel {
  modelID: string;
  lastUsedDate?: number;
}

function modelFromUnknownId(id: string): ModelInfo {
  return {
    id,
    label: id,
    provider: "Unknown",
    local: false,
    requiresAPIKey: false,
  };
}

export function getAllKnownModels(): ModelInfo[] {
  const recent = tryReadJSONPref<RecentDictationModel[]>(
    "recentDictationModels",
  );
  if (!recent || recent.length === 0) return MODEL_REGISTRY;
  const known = new Set(MODEL_REGISTRY.map((m) => m.id));
  const extras: ModelInfo[] = [];
  for (const r of recent) {
    if (!r.modelID) continue;
    if (known.has(r.modelID)) continue;
    extras.push(modelFromUnknownId(r.modelID));
    known.add(r.modelID);
  }
  return [...MODEL_REGISTRY, ...extras];
}

export function getModel(id: string): ModelInfo | undefined {
  return getAllKnownModels().find((m) => m.id === id);
}
