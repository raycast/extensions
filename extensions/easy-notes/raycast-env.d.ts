/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Note File Path (JSON) - File to save note details */
  "noteFile": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `create-note` command */
  export type CreateNote = ExtensionPreferences & {}
  /** Preferences accessible in the `view-notes` command */
  export type ViewNotes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `create-note` command */
  export type CreateNote = {}
  /** Arguments passed to the `view-notes` command */
  export type ViewNotes = {}
}


