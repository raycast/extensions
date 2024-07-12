/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Token - Your Hack Club Arcade API token */
  "apiToken": string,
  /** Slack User ID - Your Slack User ID */
  "userid": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
  /** Preferences accessible in the `startSession` command */
  export type StartSession = ExtensionPreferences & {}
  /** Preferences accessible in the `pauseSession` command */
  export type PauseSession = ExtensionPreferences & {}
  /** Preferences accessible in the `endSession` command */
  export type EndSession = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
  /** Arguments passed to the `startSession` command */
  export type StartSession = {}
  /** Arguments passed to the `pauseSession` command */
  export type PauseSession = {}
  /** Arguments passed to the `endSession` command */
  export type EndSession = {}
}


