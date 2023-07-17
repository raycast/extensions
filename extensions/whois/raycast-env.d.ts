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
  /** Preferences accessible in the `whois` command */
  export type Whois = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `whois` command */
  export type Whois = {
  /** raycast.com */
  "domain": string
}
}
