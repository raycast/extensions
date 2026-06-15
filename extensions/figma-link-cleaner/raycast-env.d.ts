/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** URL Shortening - When enabled, cleaned URLs will also be shortened via fgma.cc for even shorter links (e.g., fgma.cc/abc123) */
  "shortenerEnabled": boolean,
  /** API Key (Optional) - Optional API key for fgma.cc authentication. Leave empty for public use. */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `clean-figma-link` command */
  export type CleanFigmaLink = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `clean-figma-link` command */
  export type CleanFigmaLink = {}
}

