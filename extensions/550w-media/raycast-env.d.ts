/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Authentication - OAuth account connection or API Key */
  "authMode": "oauth" | "api-key",
  /** API Key - Get and manage your key: https://eraser.550wai.com/api/ */
  "apiKey"?: string,
  /** User No - API account user number */
  "userNo"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `media` command */
  export type Media = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `media` command */
  export type Media = {}
}

