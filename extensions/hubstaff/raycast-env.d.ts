/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Hubstaff CLI Path - Path to the HubstaffCLI executable */
  "cliPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `toggle-hubstaff` command */
  export type ToggleHubstaff = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-hubstaff` command */
  export type ManageHubstaff = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `toggle-hubstaff` command */
  export type ToggleHubstaff = {}
  /** Arguments passed to the `manage-hubstaff` command */
  export type ManageHubstaff = {}
}

