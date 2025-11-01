import { VoiceSettings } from "../voice/types";

/**
 * Configuration object for ElevenLabs streaming API
 * Includes text content, voice settings, and streaming parameters
 */
export interface ElevenLabsConfig {
  text: string;
  voice_settings: VoiceSettings;
  generation_config: {
    chunk_length_schedule: number[]; // Defines how audio is split into chunks
    stream_chunk_size: number; // Size of each audio chunk in bytes
  };
}

/**
 * WebSocket message format from ElevenLabs streaming API
 * audio: Base64 encoded audio chunk
 * isFinal: Indicates the last chunk of the stream
 */
export interface WSMessage {
  audio?: string;
  isFinal?: boolean;
  error?: string;
}

/**
 * Configuration for audio streaming and playback
 * Centralizes settings to reduce function argument counts
 */
export interface StreamConfig {
  text: string;
  voiceId: string;
  apiKey: string;
  settings: VoiceSettings;
  playbackSpeed: string; // Speed multiplier for audio playback (0.5-2.0)
}
