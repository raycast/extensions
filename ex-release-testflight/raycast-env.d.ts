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
  /** Preferences accessible in the `release-testflight` command */
  export type ReleaseTestflight = ExtensionPreferences & {}
  /** Preferences accessible in the `resume-release` command */
  export type ResumeRelease = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `release-testflight` command */
  export type ReleaseTestflight = {}
  /** Arguments passed to the `resume-release` command */
  export type ResumeRelease = {}
}

