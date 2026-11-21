/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Typing Speed - Delay between characters, in milliseconds (5–1000) */
  "charDelayMs": string,
  /** Start Delay - Milliseconds to wait before typing starts, so focus settles on the target app */
  "startDelayMs": string,
  /** Press Return - Press Return after the text finishes typing */
  "pressReturn": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `type-out` command */
  export type TypeOut = ExtensionPreferences & {}
  /** Preferences accessible in the `history` command */
  export type History = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `type-out` command */
  export type TypeOut = {
  /** Text to type (leave empty to use clipboard) */
  "text": string
}
  /** Arguments passed to the `history` command */
  export type History = {}
}

