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
  /** Preferences accessible in the `insert-date` command */
  export type InsertDate = ExtensionPreferences & {
  /** Date Format - Choose a preset or select Custom to use the field below */
  "dateFormat": "%Y%m%d" | "%m/%d/%Y" | "%d/%m/%Y" | "%B %-d, %Y" | "%a, %b %-d" | "%Y-%m-%d %H:%M" | "%H:%M" | "custom",
  /** Custom Format - Tokens: YYYY (year), MM (month), DD (day), HH (hour), mm (minute), ss (second). e.g. YYYY-MM-DD or MM/DD/YYYY */
  "customFormat": string
}
}

declare namespace Arguments {
  /** Arguments passed to the `insert-date` command */
  export type InsertDate = {}
}

