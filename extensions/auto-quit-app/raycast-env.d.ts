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
  /** Preferences accessible in the `set-auto-quit-app` command */
  export type SetAutoQuitApp = ExtensionPreferences & {
  /** App Layout - Set the layout of the app items. */
  "layout": "Grid" | "List",
  /** App Item Coloums - Set the number of columns of the app items. (Only works with Grid layout) */
  "columns"?: "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8",
  /** App Item Inset - Set the inset of the app items. (Only works with Grid layout) */
  "itemInset"?: "" | "sm" | "md" | "lg"
}
  /** Preferences accessible in the `auto-quit-app-menubar` command */
  export type AutoQuitAppMenubar = ExtensionPreferences & {
  /** Refresh Interval - Set the refresh interval for auto-quit app extensions. */
  "refreshInterval"?: "5" | "10" | "15" | "20"
}
}

declare namespace Arguments {
  /** Arguments passed to the `set-auto-quit-app` command */
  export type SetAutoQuitApp = {}
  /** Arguments passed to the `auto-quit-app-menubar` command */
  export type AutoQuitAppMenubar = {}
}
