/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Time Format - 24 hour clock */
  "hour24": boolean,
  /** Date Format - Date format */
  "dateFormat": "zh" | "en" | "en-GB"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `query-world-time` command */
  export type QueryWorldTime = ExtensionPreferences & {
  /** Timezone Layout - Set the layout of the timezone items. */
  "itemLayout": "Grid" | "List",
  /** Timezone Item Coloums - Set the number of columns of the timezone items. (Only works with Grid layout) */
  "columns": "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8",
  /** Advanced Preferences - Show clock in Detail. (Only works with List layout) */
  "showClock": boolean,
  /**  - Remember timezone filter tag. */
  "rememberTag": boolean
}
  /** Preferences accessible in the `query-world-time-menu-bar` command */
  export type QueryWorldTimeMenuBar = ExtensionPreferences & {}
  /** Preferences accessible in the `query-ip-time` command */
  export type QueryIpTime = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `query-world-time` command */
  export type QueryWorldTime = {}
  /** Arguments passed to the `query-world-time-menu-bar` command */
  export type QueryWorldTimeMenuBar = {}
  /** Arguments passed to the `query-ip-time` command */
  export type QueryIpTime = {}
}
