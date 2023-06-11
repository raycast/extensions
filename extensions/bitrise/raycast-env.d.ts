/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Bitrise Token - Bitrise API Personal Access Token */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `builds` command */
  export type Builds = ExtensionPreferences & {}
  /** Preferences accessible in the `apps` command */
  export type Apps = ExtensionPreferences & {}
  /** Preferences accessible in the `start-build` command */
  export type StartBuild = ExtensionPreferences & {}
  /** Preferences accessible in the `steps` command */
  export type Steps = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `builds` command */
  export type Builds = {}
  /** Arguments passed to the `apps` command */
  export type Apps = {}
  /** Arguments passed to the `start-build` command */
  export type StartBuild = {}
  /** Arguments passed to the `steps` command */
  export type Steps = {}
}
