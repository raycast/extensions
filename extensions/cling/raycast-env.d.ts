/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Terminal Application - The terminal app to use for "Open in Terminal". Falls back to the Cling app setting, then Terminal.app. */
  "terminalApp"?: import("@raycast/api").Application,
  /** Editor Application - The editor app to use for "Open in Editor". Falls back to the Cling app setting, then Visual Studio Code. */
  "editorApp"?: import("@raycast/api").Application,
  /** Shelf Application - The shelf app to use for "Shelve File" (e.g. Yoink, Dropover, Dockside). Falls back to the Cling app setting, then auto-detects installed shelf apps. */
  "shelfApp"?: import("@raycast/api").Application
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `fuzzy-search-files` command */
  export type FuzzySearchFiles = ExtensionPreferences & {}
  /** Preferences accessible in the `reindex-files` command */
  export type ReindexFiles = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `fuzzy-search-files` command */
  export type FuzzySearchFiles = {}
  /** Arguments passed to the `reindex-files` command */
  export type ReindexFiles = {
  /** Scope */
  "scope": "home" | "library" | "applications" | "system" | "root"
}
}