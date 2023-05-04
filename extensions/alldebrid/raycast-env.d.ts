/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Alldebrid api key */
  "apikey"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `saveLink` command */
  export type SaveLink = ExtensionPreferences & {}
  /** Preferences accessible in the `debridLink` command */
  export type DebridLink = ExtensionPreferences & {}
  /** Preferences accessible in the `magnetFile` command */
  export type MagnetFile = ExtensionPreferences & {}
  /** Preferences accessible in the `myLinks` command */
  export type MyLinks = ExtensionPreferences & {}
  /** Preferences accessible in the `myMagnets` command */
  export type MyMagnets = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `saveLink` command */
  export type SaveLink = {}
  /** Arguments passed to the `debridLink` command */
  export type DebridLink = {}
  /** Arguments passed to the `magnetFile` command */
  export type MagnetFile = {}
  /** Arguments passed to the `myLinks` command */
  export type MyLinks = {}
  /** Arguments passed to the `myMagnets` command */
  export type MyMagnets = {}
}
