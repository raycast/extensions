/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your svg.new API key from svg.new/account */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `convert-to-svg` command */
  export type ConvertToSvg = ExtensionPreferences & {}
  /** Preferences accessible in the `convert-clipboard-to-svg` command */
  export type ConvertClipboardToSvg = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `convert-to-svg` command */
  export type ConvertToSvg = {}
  /** Arguments passed to the `convert-clipboard-to-svg` command */
  export type ConvertClipboardToSvg = {}
}

