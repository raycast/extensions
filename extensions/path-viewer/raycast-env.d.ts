/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default View Path - The path that will be viewed when no path entered */
  "defaultPath": string,
  /** Ignore Names (use `,` to split names) - Names that need to be ignored when viewing */
  "ignoreName": string,
  /** Advanced Setting - Show hidden files and folders */
  "showHidden": boolean,
  /**  - Handle app as a file instead of a folder */
  "appAsFile": boolean,
  /** Sort Type - Sort type when displaying files and folders */
  "sortType": "0" | "na" | "nd" | "ea" | "ed"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `view-dir` command */
  export type ViewDir = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `view-dir` command */
  export type ViewDir = {
  /** path */
  "path": string
}
}


