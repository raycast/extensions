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
  /** Preferences accessible in the `search-portals` command */
  export type SearchPortals = ExtensionPreferences & {}
  /** Preferences accessible in the `add-portal` command */
  export type AddPortal = ExtensionPreferences & {}
  /** Preferences accessible in the `import-portals` command */
  export type ImportPortals = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-portals` command */
  export type SearchPortals = {}
  /** Arguments passed to the `add-portal` command */
  export type AddPortal = {}
  /** Arguments passed to the `import-portals` command */
  export type ImportPortals = {}
}
