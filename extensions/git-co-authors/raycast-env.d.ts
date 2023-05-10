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
  /** Preferences accessible in the `choose-coauthor` command */
  export type ChooseCoauthor = ExtensionPreferences & {}
  /** Preferences accessible in the `add-or-edit-author` command */
  export type AddOrEditAuthor = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `choose-coauthor` command */
  export type ChooseCoauthor = {}
  /** Arguments passed to the `add-or-edit-author` command */
  export type AddOrEditAuthor = {}
}
