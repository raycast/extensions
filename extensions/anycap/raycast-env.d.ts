/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Anycap.app Path - Where Anycap.app lives. The commands talk to the MCP binary inside it; no server, no account. */
  "appPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `capture-form` command */
  export type CaptureForm = ExtensionPreferences & {}
  /** Preferences accessible in the `save-tab` command */
  export type SaveTab = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `capture` command */
  export type Capture = ExtensionPreferences & {}
  /** Preferences accessible in the `save-clipboard` command */
  export type SaveClipboard = ExtensionPreferences & {}
  /** Preferences accessible in the `folders` command */
  export type Folders = ExtensionPreferences & {}
  /** Preferences accessible in the `collections` command */
  export type Collections = ExtensionPreferences & {}
  /** Preferences accessible in the `open-latest` command */
  export type OpenLatest = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `capture-form` command */
  export type CaptureForm = {}
  /** Arguments passed to the `save-tab` command */
  export type SaveTab = {}
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `capture` command */
  export type Capture = {
  /** Link or note */
  "content": string
}
  /** Arguments passed to the `save-clipboard` command */
  export type SaveClipboard = {}
  /** Arguments passed to the `folders` command */
  export type Folders = {}
  /** Arguments passed to the `collections` command */
  export type Collections = {}
  /** Arguments passed to the `open-latest` command */
  export type OpenLatest = {}
}

