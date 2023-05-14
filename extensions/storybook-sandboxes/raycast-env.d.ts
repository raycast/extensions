/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default Directory - The default directory to create new local Storybook sandbox in */
  "defaultDirectory"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `online` command */
  export type Online = ExtensionPreferences & {}
  /** Preferences accessible in the `local` command */
  export type Local = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `online` command */
  export type Online = {}
  /** Arguments passed to the `local` command */
  export type Local = {}
}
