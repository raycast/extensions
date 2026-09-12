/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Volume - Default volume when adding a new sound (0-100) */
  "defaultVolume": string,
  /** Show Sound Count in Menu Bar - Display the number of active sounds next to the menu bar icon */
  "showMenuBarCount": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `mix-sounds` command */
  export type MixSounds = ExtensionPreferences & {}
  /** Preferences accessible in the `toggle-playback` command */
  export type TogglePlayback = ExtensionPreferences & {}
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-presets` command */
  export type ManagePresets = ExtensionPreferences & {}
  /** Preferences accessible in the `set-timer` command */
  export type SetTimer = ExtensionPreferences & {}
  /** Preferences accessible in the `stop-all` command */
  export type StopAll = ExtensionPreferences & {}
  /** Preferences accessible in the `keep-alive` command */
  export type KeepAlive = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `mix-sounds` command */
  export type MixSounds = {}
  /** Arguments passed to the `toggle-playback` command */
  export type TogglePlayback = {}
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
  /** Arguments passed to the `manage-presets` command */
  export type ManagePresets = {}
  /** Arguments passed to the `set-timer` command */
  export type SetTimer = {}
  /** Arguments passed to the `stop-all` command */
  export type StopAll = {}
  /** Arguments passed to the `keep-alive` command */
  export type KeepAlive = {}
}

