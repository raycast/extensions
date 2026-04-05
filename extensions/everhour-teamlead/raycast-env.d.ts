/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your Everhour API key. Find it in your Everhour profile under Application Access. */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `team-overview` command */
  export type TeamOverview = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `team-overview` command */
  export type TeamOverview = {}
}

