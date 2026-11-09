/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Optional. Paste an account API key from tiro.ooo/platform/me/api-keys to use it instead of signing in. */
  "apiKey"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-notes` command */
  export type SearchNotes = ExtensionPreferences & {}
  /** Preferences accessible in the `start-live-note` command */
  export type StartLiveNote = ExtensionPreferences & {}
  /** Preferences accessible in the `end-live-note` command */
  export type EndLiveNote = ExtensionPreferences & {}
  /** Preferences accessible in the `start-offline-recording` command */
  export type StartOfflineRecording = ExtensionPreferences & {}
  /** Preferences accessible in the `end-offline-recording` command */
  export type EndOfflineRecording = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-notes` command */
  export type SearchNotes = {}
  /** Arguments passed to the `start-live-note` command */
  export type StartLiveNote = {}
  /** Arguments passed to the `end-live-note` command */
  export type EndLiveNote = {}
  /** Arguments passed to the `start-offline-recording` command */
  export type StartOfflineRecording = {}
  /** Arguments passed to the `end-offline-recording` command */
  export type EndOfflineRecording = {}
}

