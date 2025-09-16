export type Provider = "elevenlabs" | "ai302";

export type Preferences = {
  /** Absolute path to the SoX executable, optional. */
  soxExecutablePath?: string;

  /** Transcription provider to use. */
  provider?: Provider;

  /** ElevenLabs API key (header: xi-api-key). */
  elevenlabsApiKey?: string;

  /** 302.ai base URL (full endpoint). */
  ai302ApiBaseUrl?: string;

  /** 302.ai API key (Authorization: Bearer <key>). */
  ai302ApiKey?: string;

  /** Model ID used by the provider. */
  modelId?: string;
};
