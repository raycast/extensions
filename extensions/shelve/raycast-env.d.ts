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
  /** Preferences accessible in the `encrypt` command */
  export type Encrypt = ExtensionPreferences & {}
  /** Preferences accessible in the `decrypt` command */
  export type Decrypt = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `encrypt` command */
  export type Encrypt = {}
  /** Arguments passed to the `decrypt` command */
  export type Decrypt = {}
}

