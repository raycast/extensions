/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Cosmic Bucket Slug - Your Cosmic Bucket Slug */
  "bucketSlug": string,
  /** Cosmic Read Key - Your Cosmic Read Key */
  "readKey": string,
  /** Cosmic Write Key - Your Cosmic Write Key */
  "writeKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `bookmarks` command */
  export type Bookmarks = ExtensionPreferences & {}
  /** Preferences accessible in the `save-bookmarks` command */
  export type SaveBookmarks = ExtensionPreferences & {}
  /** Preferences accessible in the `menubar` command */
  export type Menubar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `bookmarks` command */
  export type Bookmarks = {}
  /** Arguments passed to the `save-bookmarks` command */
  export type SaveBookmarks = {}
  /** Arguments passed to the `menubar` command */
  export type Menubar = {}
}
