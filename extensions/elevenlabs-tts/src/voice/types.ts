/**
 * Voice generation settings passed to ElevenLabs API
 * Controls the characteristics of the generated speech
 */
export interface VoiceSettings {
  stability: number; // Higher values = more consistent voice
  similarity_boost: number; // Higher values = clearer but potentially less natural
}
