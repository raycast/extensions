/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** FreshRSS Base URL - The base URL of your FreshRSS instance (e.g., https://rss.example.com) */
  "baseUrl": string,
  /** Username - Your FreshRSS username */
  "username": string,
  /** API Password - Your FreshRSS API password (configured in FreshRSS account settings) */
  "apiPassword": string,
  /** Debug Logging - Enable verbose FreshRSS request logs in Raycast developer logs for troubleshooting. */
  "debugLogging": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `today` command */
  export type Today = ExtensionPreferences & {}
  /** Preferences accessible in the `starred` command */
  export type Starred = ExtensionPreferences & {}
  /** Preferences accessible in the `random` command */
  export type Random = ExtensionPreferences & {}
  /** Preferences accessible in the `feeds` command */
  export type Feeds = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `today` command */
  export type Today = {}
  /** Arguments passed to the `starred` command */
  export type Starred = {}
  /** Arguments passed to the `random` command */
  export type Random = {}
  /** Arguments passed to the `feeds` command */
  export type Feeds = {}
}

