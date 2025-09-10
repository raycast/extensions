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
  /** Preferences accessible in the `view-contacts` command */
  export type ViewContacts = ExtensionPreferences & {}
  /** Preferences accessible in the `create-contact` command */
  export type CreateContact = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `view-contacts` command */
  export type ViewContacts = {}
  /** Arguments passed to the `create-contact` command */
  export type CreateContact = {}
}

