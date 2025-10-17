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
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `list-explorers` command */
  export type ListExplorers = ExtensionPreferences & {}
  /** Preferences accessible in the `saved-addresses` command */
  export type SavedAddresses = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `list-explorers` command */
  export type ListExplorers = {}
  /** Arguments passed to the `saved-addresses` command */
  export type SavedAddresses = {}
}

