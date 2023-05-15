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
  /** Preferences accessible in the `ticker` command */
  export type Ticker = ExtensionPreferences & {}
  /** Preferences accessible in the `wl` command */
  export type Wl = ExtensionPreferences & {}
  /** Preferences accessible in the `market` command */
  export type Market = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ticker` command */
  export type Ticker = {
  /** Token ID or symbol */
  "token": string
}
  /** Arguments passed to the `wl` command */
  export type Wl = {}
  /** Arguments passed to the `market` command */
  export type Market = {}
}
