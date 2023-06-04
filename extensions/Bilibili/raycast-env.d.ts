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
  /** Preferences accessible in the `dynamicFeed` command */
  export type DynamicFeed = ExtensionPreferences & {}
  /** Preferences accessible in the `popularVideos` command */
  export type PopularVideos = ExtensionPreferences & {}
  /** Preferences accessible in the `rcmdVideos` command */
  export type RcmdVideos = ExtensionPreferences & {}
  /** Preferences accessible in the `popularSeries` command */
  export type PopularSeries = ExtensionPreferences & {}
  /** Preferences accessible in the `login` command */
  export type Login = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `dynamicFeed` command */
  export type DynamicFeed = {}
  /** Arguments passed to the `popularVideos` command */
  export type PopularVideos = {}
  /** Arguments passed to the `rcmdVideos` command */
  export type RcmdVideos = {}
  /** Arguments passed to the `popularSeries` command */
  export type PopularSeries = {}
  /** Arguments passed to the `login` command */
  export type Login = {}
}
