/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Retry Count - The number of times to retry a failed search (default: 4) */
  "retries": string,
  /** Sleep Time - The time (in milliseconds) to sleep between retries (default: 2000) */
  "sleep": string,
  /** Locale - The locale of the search (default: en-us) */
  "locale": string,
  /** Save Directory - Directory where images will be saved (default: ~/Downloads) */
  "saveDirectory": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-image` command */
  export type SearchImage = ExtensionPreferences & {
  /** Moderate Search - Moderate the search results (may cause some results to be removed) */
  "moderate": boolean,
  /** License - The license of the images to search */
  "license": "" | "Any" | "Public" | "Share" | "ShareCommercially" | "Modify" | "ModifyCommercially",
  /** Primary Image Action - Choose the primary action when selecting an image */
  "primaryAction": "quicklook" | "browser"
}
}

declare namespace Arguments {
  /** Arguments passed to the `search-image` command */
  export type SearchImage = {}
}

