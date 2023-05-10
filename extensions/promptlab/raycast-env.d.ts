/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /**  - If checked, PromptLab will use OCR to extract text from PDFs. This takes longer but enables analysis of more PDF content types. */
  "pdfOCR"?: boolean,
  /** Model Endpoint - The API endpoint of the model used to generate PromptLab command output. Set to 'Raycast AI' to use the Raycast AI API. */
  "modelEndpoint"?: string,
  /** API Authorization Type - The authorization type for the model endpoint, e.g. API Key or Bearer. This is only used if the model source is set to something other than Raycast AI. */
  "authType"?: "apiKey" | "bearerToken",
  /** API Key - The API key for the model source. This is only used if the model source is set to something other than Raycast AI. */
  "apiKey"?: string,
  /** Input Schema - The JSON schema of the endpoint used to generate PromptLab command output. This is only used if the model source is set to something other than Raycast AI. Use {input} to represent PromptLab's input to the command. */
  "inputSchema"?: string,
  /** Output Key Path - The key path to the text output in the JSON response from the model endpoint. For example, choices[0].message.content, for the OpenAI API. This is only used if the model source is set to something other than Raycast AI. */
  "outputKeyPath"?: string,
  /** Output Timing - Whether output from the model endpoint should be processed synchronously or asynchronously. Often, this is also an option on the model API. This is only used if the model source is set to something other than Raycast AI. */
  "outputTiming"?: "sync" | "async"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `summarize-files` command */
  export type SummarizeFiles = ExtensionPreferences & {}
  /** Preferences accessible in the `create-command` command */
  export type CreateCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `search-commands` command */
  export type SearchCommands = ExtensionPreferences & {}
  /** Preferences accessible in the `chat` command */
  export type Chat = ExtensionPreferences & {
  /** Default Chat Settings - If checked, the selected files will be used as context for conversations by default. */
  "useSelectedFiles"?: boolean,
  /**  - If checked, the conversation history will be used as context for conversations by default. */
  "useConversationHistory"?: boolean,
  /**  - If checked, autonomous agent features such as 'Allow AI To Run Commands' will be enabled by default. */
  "autonomousFeatures"?: boolean,
  /** Base Prompt - The base prompt that provides the initial context for the conversation. */
  "basePrompt"?: string
}
  /** Preferences accessible in the `import-commands` command */
  export type ImportCommands = ExtensionPreferences & {}
  /** Preferences accessible in the `discover-commands` command */
  export type DiscoverCommands = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `summarize-files` command */
  export type SummarizeFiles = {}
  /** Arguments passed to the `create-command` command */
  export type CreateCommand = {}
  /** Arguments passed to the `search-commands` command */
  export type SearchCommands = {
  /** Command Name */
  "commandName": string
}
  /** Arguments passed to the `chat` command */
  export type Chat = {
  /** Initial Query */
  "initialQuery": string
}
  /** Arguments passed to the `import-commands` command */
  export type ImportCommands = {}
  /** Arguments passed to the `discover-commands` command */
  export type DiscoverCommands = {}
}
