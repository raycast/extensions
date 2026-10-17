/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Socket Path - Path to the Kitty remote control socket. Leave empty to auto-detect /tmp/kitty-socket-{pid} */
  "socketPath": string,
  /** Kitten Path - Path to the kitten binary. Leave empty to auto-detect from PATH and standard locations */
  "kittenPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `new-kitty-window` command */
  export type NewKittyWindow = ExtensionPreferences & {}
  /** Preferences accessible in the `new-kitty-tab` command */
  export type NewKittyTab = ExtensionPreferences & {}
  /** Preferences accessible in the `search-kitty-tabs` command */
  export type SearchKittyTabs = ExtensionPreferences & {}
  /** Preferences accessible in the `open-kitty-launch-config` command */
  export type OpenKittyLaunchConfig = ExtensionPreferences & {}
  /** Preferences accessible in the `open-with-kitty` command */
  export type OpenWithKitty = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `new-kitty-window` command */
  export type NewKittyWindow = {}
  /** Arguments passed to the `new-kitty-tab` command */
  export type NewKittyTab = {}
  /** Arguments passed to the `search-kitty-tabs` command */
  export type SearchKittyTabs = {}
  /** Arguments passed to the `open-kitty-launch-config` command */
  export type OpenKittyLaunchConfig = {}
  /** Arguments passed to the `open-with-kitty` command */
  export type OpenWithKitty = {}
}

