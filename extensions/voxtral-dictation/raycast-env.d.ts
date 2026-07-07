/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Mistral API Key - Your Mistral AI API key for Voxtral transcription */
  "apiKey": string,
  /** Auto-Reformulate - Automatically reformulate transcriptions before pasting */
  "autoReformulate": boolean,
  /** Reformulation Prompt - Custom system prompt for reformulating transcriptions. Leave empty for the default. */
  "reformulatePrompt": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `dictate` command */
  export type Dictate = ExtensionPreferences & {}
  /** Preferences accessible in the `reformulate` command */
  export type Reformulate = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `dictate` command */
  export type Dictate = {}
  /** Arguments passed to the `reformulate` command */
  export type Reformulate = {}
}

