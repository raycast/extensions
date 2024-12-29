/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OTP Auth Database Path - Your OTP Auth Database */
  "dbPath": string,
  /** OTP Auth Password - Your OTP Auth Encryption Password */
  "dbPassword": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-token` command */
  export type SearchToken = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-token` command */
  export type SearchToken = {}
}

