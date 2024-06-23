/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Server URL - Enter the URL of your Anki server */
  "server_url": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `postNote` command */
  export type PostNote = ExtensionPreferences & {}
  /** Preferences accessible in the `postDeck` command */
  export type PostDeck = ExtensionPreferences & {}
  /** Preferences accessible in the `getNotesFromDeck` command */
  export type GetNotesFromDeck = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `postNote` command */
  export type PostNote = {}
  /** Arguments passed to the `postDeck` command */
  export type PostDeck = {}
  /** Arguments passed to the `getNotesFromDeck` command */
  export type GetNotesFromDeck = {}
}


