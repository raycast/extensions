/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {
  /** Translation Language - Language shown in the translation row. */
  "language": "none" | "fr" | "es" | "it" | "de" | "pt" | "nl" | "sv" | "pl" | "ru" | "el" | "tr" | "ar" | "hi" | "zh" | "ja" | "ko"
}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}

