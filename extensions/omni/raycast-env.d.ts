/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Omni Binary Path - Path to the omni binary. Leave empty to auto-detect from PATH / npm global. */
  "omniBinary"?: string,
  /** Default Stop Mode - What to do with transcribed text when stopping via Toggle Transcription. */
  "stopMode": "insert" | "copy" | ""
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `toggle-transcription` command */
  export type ToggleTranscription = ExtensionPreferences & {}
  /** Preferences accessible in the `transcribe-copy` command */
  export type TranscribeCopy = ExtensionPreferences & {}
  /** Preferences accessible in the `input-devices` command */
  export type InputDevices = ExtensionPreferences & {}
  /** Preferences accessible in the `status` command */
  export type Status = ExtensionPreferences & {}
  /** Preferences accessible in the `doctor` command */
  export type Doctor = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `toggle-transcription` command */
  export type ToggleTranscription = {}
  /** Arguments passed to the `transcribe-copy` command */
  export type TranscribeCopy = {}
  /** Arguments passed to the `input-devices` command */
  export type InputDevices = {}
  /** Arguments passed to the `status` command */
  export type Status = {}
  /** Arguments passed to the `doctor` command */
  export type Doctor = {}
}

