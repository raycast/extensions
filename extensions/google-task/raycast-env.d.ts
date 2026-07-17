/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** OAuth Client ID - Your OAuth client ID. */
  "clientId": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `view-lists` command */
  export type ViewLists = ExtensionPreferences & {}
  /** Preferences accessible in the `create-task` command */
  export type CreateTask = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `view-lists` command */
  export type ViewLists = {}
  /** Arguments passed to the `create-task` command */
  export type CreateTask = {}
}

