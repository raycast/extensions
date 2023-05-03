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
  /** Preferences accessible in the `scan-qrcode-from-clipboard` command */
  export type ScanQrcodeFromClipboard = ExtensionPreferences & {}
  /** Preferences accessible in the `generate-qrcode-from-clipboard` command */
  export type GenerateQrcodeFromClipboard = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `scan-qrcode-from-clipboard` command */
  export type ScanQrcodeFromClipboard = {}
  /** Arguments passed to the `generate-qrcode-from-clipboard` command */
  export type GenerateQrcodeFromClipboard = {}
}
