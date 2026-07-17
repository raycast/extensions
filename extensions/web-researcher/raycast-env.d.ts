/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Ollama URL - URL of your local Ollama server */
  "ollamaUrl": string,
  /** Default Model - Default Ollama model to use (e.g., gemma3:4b, llama3.1, mistral) */
  "defaultModel": string,
  /** SearXNG URL - URL of your local SearXNG instance (optional, falls back to DuckDuckGo) */
  "searxngUrl": string,
  /** Max Search Results - Maximum number of search results to crawl */
  "maxResults": string,
  /** Max Content Length - Maximum characters to extract per page */
  "maxContentLength": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ask-web-researcher` command */
  export type AskWebResearcher = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ask-web-researcher` command */
  export type AskWebResearcher = {}
}

