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
  /** Preferences accessible in the `videoSummary` command */
  export type VideoSummary = ExtensionPreferences & {
  /** OpenAI API Token - Your OpenAI API Token */
  "openaiApiToken"?: string
}
}

declare namespace Arguments {
  /** Arguments passed to the `videoSummary` command */
  export type VideoSummary = {
  /** Video URL or ID */
  "video": string
}
}
