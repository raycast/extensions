/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Custom npm Executable Path - Set this if your npm executable is in a non-standard location or Raycast cannot find it from your shell. */
  "customNpmPath"?: string,
  /** Window Behavior - Close the Raycast window after installing, updating, or uninstalling a package. */
  "closeAfterAction": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `installed` command */
  export type Installed = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {
  /** Search View - Display package details next to the search results list. */
  "showMetadataPanel": boolean
}
  /** Preferences accessible in the `outdated` command */
  export type Outdated = ExtensionPreferences & {}
  /** Preferences accessible in the `upgrade` command */
  export type Upgrade = ExtensionPreferences & {}
  /** Preferences accessible in the `clean-up` command */
  export type CleanUp = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `installed` command */
  export type Installed = {}
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `outdated` command */
  export type Outdated = {}
  /** Arguments passed to the `upgrade` command */
  export type Upgrade = {}
  /** Arguments passed to the `clean-up` command */
  export type CleanUp = {}
}

