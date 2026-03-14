/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Browsers - Include Google Chrome profiles */
  "enableChrome": boolean,
  /** undefined - Include Microsoft Edge profiles */
  "enableEdge": boolean,
  /** undefined - Include Brave Browser profiles */
  "enableBrave": boolean,
  /** undefined - Include Arc profiles */
  "enableArc": boolean,
  /** undefined - Include Vivaldi profiles */
  "enableVivaldi": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `browse-profiles` command */
  export type BrowseProfiles = ExtensionPreferences & {}
  /** Preferences accessible in the `open-profile` command */
  export type OpenProfile = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `browse-profiles` command */
  export type BrowseProfiles = {}
  /** Arguments passed to the `open-profile` command */
  export type OpenProfile = {}
}

