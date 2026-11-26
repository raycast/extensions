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
  /** Preferences accessible in the `check` command */
  export type Check = ExtensionPreferences & {
  /** Domain - Domain to check when no argument is given. Host name only, without https:// or a path. */
  "domain"?: string,
  /** iOS App ID - Apple team ID and bundle ID. If set, the check requires this app ID in the AASA file. */
  "iosAppId"?: string,
  /** Android Package - If set, the check requires this package with a signing certificate fingerprint in assetlinks.json. */
  "androidPackage"?: string
}
}

declare namespace Arguments {
  /** Arguments passed to the `check` command */
  export type Check = {
  /** example.com */
  "domain": string
}
}

