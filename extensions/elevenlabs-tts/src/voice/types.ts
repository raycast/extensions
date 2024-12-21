/**
 * Preferences configurable through Raycast's UI
 * These settings affect voice generation quality and characteristics
 */
export interface Preferences {
  elevenLabsApiKey: string; // API key from ElevenLabs dashboard
  voiceId: string; // Selected voice identifier
  stability: string; // Voice stability (0.0-1.0)
  similarityBoost: string; // Voice clarity enhancement (0.0-1.0)
}

/**
 * Voice generation settings passed to ElevenLabs API
 * Controls the characteristics of the generated speech
 */
export interface VoiceSettings {
  stability: number; // Higher values = more consistent voice
  similarity_boost: number; // Higher values = clearer but potentially less natural
}
