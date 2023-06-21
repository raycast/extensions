/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** General Settings - If checked, PromptLab will use OCR to extract text from PDFs. This takes longer but enables analysis of more PDF content types. */
  "pdfOCR"?: boolean,
  /** Primary Command Action - The top action of the actions menu in command response views. */
  "primaryAction"?: "copy-response-to-clipboard" | "paste-to-active-app" | "copy-prompt-to-clipboard" | "open-chat" | "regenerate",
  /** Level of Automatic Input Condensing - The amount of automatic input condensing to apply to the input text. Higher levels will remove more characters and cut out excess verbiage, resulting in far fewer tokens. However, this may result in less accurate results. Adjust this value according to the model's token limit. For Raycast AI, use 'Medium' or 'High'. */
  "condenseAmount"?: "high" | "medium" | "low" | "none",
  /** Prompt Prefix - Text to prepend at the start of every prompt. This can be used to set context for all commands. */
  "promptPrefix"?: string,
  /** Prompt Suffix - Text to append and the end of every prompt. This can be used to set context for all commands. */
  "promptSuffix"?: string,
  /** Model Endpoint - The API endpoint of the model used to generate PromptLab command output. Set to 'Raycast AI' to use the Raycast AI API. */
  "modelEndpoint"?: string,
  /** API Authorization Type - The authorization type for the model endpoint, e.g. API Key or Bearer. This is only used if the model source is set to something other than Raycast AI. */
  "authType"?: "apiKey" | "bearerToken" | "x-api-key",
  /** API Key - The API key for the model source. This is only used if the model source is set to something other than Raycast AI. */
  "apiKey"?: string,
  /** Input Schema - The JSON schema of the endpoint used to generate PromptLab command output. This is only used if the model source is set to something other than Raycast AI. Use {input} to represent PromptLab's input to the command. */
  "inputSchema"?: string,
  /**  - If checked, PromptLab will include a temperature (creativity) parameter in the model input, using the value specified during command creation. You may need to disable this if the model does not support temperature. Disabling this will also disable the 'Creativity' textfield in the command creation view. */
  "includeTemperature"?: boolean,
  /** Output Key Path - The key path to the text output in the JSON response from the model endpoint. For example, choices[0].message.content, for the OpenAI API. This is only used if the model source is set to something other than Raycast AI. */
  "outputKeyPath"?: string,
  /** Output Timing - Whether output from the model endpoint should be processed synchronously or asynchronously. Often, this is also an option on the model API. This is only used if the model source is set to something other than Raycast AI. */
  "outputTiming"?: "sync" | "async",
  /** Prompt Length Limit - The maximum length of the prompt that will be sent to the model endpoint, beyond which it will be truncated. Larger values will support more content, but may result in token count errors. Adjust this value according to the model's token limit (but leave some space, e.g. 1000 characters, for additional input and placeholders). */
  "lengthLimit"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `summarize-files` command */
  export type SummarizeFiles = ExtensionPreferences & {}
  /** Preferences accessible in the `create-command` command */
  export type CreateCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `search-commands` command */
  export type SearchCommands = ExtensionPreferences & {
  /**  - If checked, each command category will have its own section in the search results. */
  "groupByCategory"?: boolean,
  /** Export Location - The folder where exported commands will be saved. */
  "exportLocation"?: string
}
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
