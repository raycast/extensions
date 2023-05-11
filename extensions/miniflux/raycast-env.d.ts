/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Miniflux URL - The URL of your Miniflux server */
  "baseUrl": string,
  /** API Key - Your Miniflux API key from 'Settings > API Keys > Create a new API key' in Miniflux */
  "apiKey": string,
  /** Readwise Access Token - Generate a token at: https://readwise.io/access_token */
  "readwiseToken"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `add-subscription` command */
  export type AddSubscription = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {
  /** Max search results - high numbers could lead to worse performance */
  "searchLimit"?: string
}
  /** Preferences accessible in the `read-recent-entries` command */
  export type ReadRecentEntries = ExtensionPreferences & {
  /** The latest feeds show on first page - High numbers could lead to poor performance. */
  "feedLimit"?: string
}
  /** Preferences accessible in the `open-miniflux` command */
  export type OpenMiniflux = ExtensionPreferences & {}
  /** Preferences accessible in the `refresh-all-feeds` command */
  export type RefreshAllFeeds = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `add-subscription` command */
  export type AddSubscription = {}
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `read-recent-entries` command */
  export type ReadRecentEntries = {}
  /** Arguments passed to the `open-miniflux` command */
  export type OpenMiniflux = {}
  /** Arguments passed to the `refresh-all-feeds` command */
  export type RefreshAllFeeds = {}
}
