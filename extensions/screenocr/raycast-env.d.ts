/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Primary Language - Primary language for text recognition */
  "primaryLanguage": "en-US" | "fr-FR" | "it-IT" | "de-DE" | "es-ES" | "pt-BR" | "zh-Hans" | "zh-Hant" | "yue-Hans" | "yue-Hant" | "ko-KR" | "ja-JP" | "ru-RU" | "uk-UA",
  /** Recognition Level - Affects performance and accuracy of the text recognition. */
  "ocrMode": "accurate" | "fast",
  /** Language Correction - Applies language correction during the recognition process. Disabling this property returns the raw recognition results, which provides performance benefits but less accurate results. */
  "languageCorrection": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `preferences` command */
  export type Preferences = ExtensionPreferences & {}
  /** Preferences accessible in the `recognize-text` command */
  export type RecognizeText = ExtensionPreferences & {}
  /** Preferences accessible in the `recognize-text-fullscreen` command */
  export type RecognizeTextFullscreen = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `preferences` command */
  export type Preferences = {}
  /** Arguments passed to the `recognize-text` command */
  export type RecognizeText = {}
  /** Arguments passed to the `recognize-text-fullscreen` command */
  export type RecognizeTextFullscreen = {}
}
