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
  /** Preferences accessible in the `round-number` command */
  export type RoundNumber = ExtensionPreferences & {
  /** Copy Result to Clipboard - Automatically copy the rounded result to your clipboard after calculation. */
  "copyToClipboard": boolean
}
}

declare namespace Arguments {
  /** Arguments passed to the `round-number` command */
  export type RoundNumber = {
  /** Round this number */
  "roundValue": string,
  /** to the nearest */
  "nearestValue": string
}
}

