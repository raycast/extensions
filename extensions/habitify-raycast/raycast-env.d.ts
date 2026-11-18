/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Habitify API Key - Create it in Habitify Settings > API. Required for all commands. */
  "apiKey": string,
  /** Row Color Mode - Choose how Raycast should tint habit rows. */
  "rowColorMode": "status" | "habit" | "area" | "off"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `current-time-of-day` command */
  export type CurrentTimeOfDay = ExtensionPreferences & {}
  /** Preferences accessible in the `areas` command */
  export type Areas = ExtensionPreferences & {}
  /** Preferences accessible in the `today-stats` command */
  export type TodayStats = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `current-time-of-day` command */
  export type CurrentTimeOfDay = {}
  /** Arguments passed to the `areas` command */
  export type Areas = {}
  /** Arguments passed to the `today-stats` command */
  export type TodayStats = {}
}

