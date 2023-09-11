/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-trends-of-social-network` command */
  export type SearchTrendsOfSocialNetwork = ExtensionPreferences & {
  /** Preferences - Remember Gist Filter Tag. */
  "rememberTag"?: boolean
}
  /** Preferences accessible in the `search-trends-of-social-network-menu-bar` command */
  export type SearchTrendsOfSocialNetworkMenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-trends-of-social-network` command */
  export type SearchTrendsOfSocialNetwork = {}
  /** Arguments passed to the `search-trends-of-social-network-menu-bar` command */
  export type SearchTrendsOfSocialNetworkMenuBar = {}
}
