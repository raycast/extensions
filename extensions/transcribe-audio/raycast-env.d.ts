/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OpenAI API Key - Used when OpenAI is selected as the transcription provider. */
  "openaiApiKey"?: string,
  /** Deepgram API Key - Used when Deepgram is selected as the transcription provider. */
  "deepgramApiKey"?: string,
  /** ElevenLabs API Key - Used when ElevenLabs is selected as the transcription provider. */
  "elevenlabsApiKey"?: string,
  /** Save Transcription History - Store recent transcriptions locally so they can be viewed again later. */
  "historyEnabled": boolean,
  /** History Retention - How long to keep saved transcriptions. */
  "historyRetentionDays": "7" | "30" | "90" | "365",
  /** Maximum History Entries - Maximum number of transcriptions to keep. */
  "historyMaxEntries": "10" | "25" | "50" | "100"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `transcribe` command */
  export type Transcribe = ExtensionPreferences & {
  /** Default Provider - Which provider to use by default. */
  "defaultProvider": "elevenlabs" | "deepgram" | "openai",
  /** Default Audio Type - What kind of recording this is by default. */
  "defaultAudioType": "voice-note" | "meeting" | "interview" | "lecture" | "call" | "podcast",
  /** Language - Leave empty for automatic language detection. Use ISO 639-1 codes (e.g. en, pt, es) where supported. */
  "language"?: string
}
  /** Preferences accessible in the `history` command */
  export type History = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `transcribe` command */
  export type Transcribe = {}
  /** Arguments passed to the `history` command */
  export type History = {}
}

