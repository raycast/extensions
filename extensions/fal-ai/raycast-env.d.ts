/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** fal API Key - Create one at https://fal.ai/dashboard/keys. The extension sends it as Authorization: Key <value>. */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `generate` command */
  export type Generate = ExtensionPreferences & {}
  /** Preferences accessible in the `history` command */
  export type History = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `generate` command */
  export type Generate = {}
  /** Arguments passed to the `history` command */
  export type History = {}
}

