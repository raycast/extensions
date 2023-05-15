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
  /** Preferences accessible in the `summarizeVideo` command */
  export type SummarizeVideo = ExtensionPreferences & {
  /** Choose AI - Choose between Raycast AI or ChatGPT */
  "chosenAi": "raycastai" | "chatgpt",
  /** OpenAI API Token - Your OpenAI API Token. Required if you choose ChatGPT as your AI. */
  "openaiApiToken"?: string,
  /** Language - Define the language which the AI should use to summarize the video. */
  "language"?: string
}
}

declare namespace Arguments {
  /** Arguments passed to the `summarizeVideo` command */
  export type SummarizeVideo = {
  /** Video URL or ID */
  "video": string
}
}
