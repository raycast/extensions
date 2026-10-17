/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Token - Token from Office Suite's CLI settings. Used only to authenticate to the local Office Suite service. */
  "token": string,
  /** Local API Port - Office Suite CLI service port (9200–9700). Only 127.0.0.1 is allowed. */
  "port": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-notes` command */
  export type SearchNotes = ExtensionPreferences & {}
  /** Preferences accessible in the `browse-folders` command */
  export type BrowseFolders = ExtensionPreferences & {}
  /** Preferences accessible in the `create-note` command */
  export type CreateNote = ExtensionPreferences & {}
  /** Preferences accessible in the `check-connection` command */
  export type CheckConnection = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-notes` command */
  export type SearchNotes = {}
  /** Arguments passed to the `browse-folders` command */
  export type BrowseFolders = {}
  /** Arguments passed to the `create-note` command */
  export type CreateNote = {}
  /** Arguments passed to the `check-connection` command */
  export type CheckConnection = {}
}

