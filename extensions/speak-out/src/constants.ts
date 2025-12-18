/**
 * Application constants and configuration.
 * @module constants
 */

// ============================================================================
// Search Configuration
// ============================================================================

/** Debounce delay for API calls (ms) */
export const SEARCH_DEBOUNCE_MS = 300;

// ============================================================================
// History Configuration
// ============================================================================

/** LocalStorage key for search history */
export const HISTORY_KEY = "pronunciation-history";

/** Maximum number of history items to store */
export const MAX_HISTORY_ITEMS = 20;

// ============================================================================
// Voice Configuration (macOS TTS)
// ============================================================================

/** Available macOS voices mapped by accent */
export const VOICES = {
  us: "Samantha",
  uk: "Daniel",
  au: "Karen",
  ie: "Moira",
  za: "Tessa",
  in: "Veena",
} as const;

export type VoiceAccent = keyof typeof VOICES;

/** TTS voice options shown when word not found in dictionary */
export const TTS_OPTIONS = [
  {
    key: "tts-us",
    voice: VOICES.us,
    label: "🇺🇸 US English (Samantha)",
    accent: "Us",
  },
  {
    key: "tts-uk",
    voice: VOICES.uk,
    label: "🇬🇧 UK English (Daniel)",
    accent: "Uk",
  },
  {
    key: "tts-au",
    voice: VOICES.au,
    label: "🇦🇺 Australian English (Karen)",
    accent: "Australian",
  },
  {
    key: "tts-in",
    voice: VOICES.in,
    label: "🇮🇳 Indian English (Veena)",
    accent: "Indian",
  },
] as const;
