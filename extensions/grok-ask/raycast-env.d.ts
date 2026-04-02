/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your xAI API key from console.x.ai */
  "apiKey": string,
  /** Ask Grok Model - Default model for Ask Grok command */
  "defaultAskModel": "grok-4.20-0309-reasoning" | "grok-4.20-0309-non-reasoning" | "grok-4-1-fast-reasoning" | "grok-4-1-fast-non-reasoning" | "grok-3" | "grok-3-mini",
  /** Chat Model - Default model for Chat with Grok command */
  "defaultChatModel": "grok-4.20-0309-reasoning" | "grok-4.20-0309-non-reasoning" | "grok-4-1-fast-reasoning" | "grok-4-1-fast-non-reasoning" | "grok-3" | "grok-3-mini",
  /** System Prompt Preset - Built-in system prompt preset */
  "systemPromptPreset": "none" | "concise" | "detailed" | "coder" | "translator" | "writer",
  /** Custom System Prompt - Custom system prompt (overrides preset if both set) */
  "systemPrompt"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask-grok` command */
  export type AskGrok = ExtensionPreferences & {}
  /** Preferences accessible in the `chat-grok` command */
  export type ChatGrok = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask-grok` command */
  export type AskGrok = {
  /** Ask anything... */
  "prompt": string
}
  /** Arguments passed to the `chat-grok` command */
  export type ChatGrok = {}
}
