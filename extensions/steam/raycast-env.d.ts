/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Steam API Key - Add your API key */
  "token"?: string,
  /** Steam ID - Add your Steam ID */
  "steamid"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `steam` command */
  export type Steam = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `steam` command */
  export type Steam = {}
}
