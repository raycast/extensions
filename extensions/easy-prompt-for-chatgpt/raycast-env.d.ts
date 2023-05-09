/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Primary Action - The primary action to perform on a selected prompt. */
  "primaryAction"?: "paste" | "copy",
  /** Preffered language - The language of the prompt, Defaults is English. */
  "lang"?: "en" | "zh-cn" | "zh-tw",
  /** Custom prompts - Customize your prompts source URL, support both JSON or CSV. For multiple sources, separate URLs with a comma. */
  "customSources"?: string,
  /** Re-fetch Timeout(in minutes) - The timeout period for re-fetching the prompts, measured in minutes. By default, this value is set to 360 minutes. */
  "refetchTimeout"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}
