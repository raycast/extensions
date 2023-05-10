/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Shared Secret (only required if set in BTT) - The shared secret used for external scripting in BTT */
  "bttSharedSecret"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `trigger` command */
  export type Trigger = ExtensionPreferences & {}
  /** Preferences accessible in the `action` command */
  export type Action = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `trigger` command */
  export type Trigger = {}
  /** Arguments passed to the `action` command */
  export type Action = {}
}
