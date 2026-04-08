/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** croc Binary Path - Path to the croc binary. Leave empty to auto-detect. */
  "crocPath": string,
  /** Download Directory - Directory where received files are saved. */
  "downloadDirectory": string,
  /** Auto Accept - Automatically accept incoming files without confirmation. */
  "autoAccept": boolean,
  /** Custom Relay Server - Custom relay server address. Leave empty to use the default. */
  "customRelay": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `send-file` command */
  export type SendFile = ExtensionPreferences & {}
  /** Preferences accessible in the `receive-file` command */
  export type ReceiveFile = ExtensionPreferences & {}
  /** Preferences accessible in the `transfer-history` command */
  export type TransferHistory = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `send-file` command */
  export type SendFile = {}
  /** Arguments passed to the `receive-file` command */
  export type ReceiveFile = {
  /** Code phrase (optional) */
  "code": string
}
  /** Arguments passed to the `transfer-history` command */
  export type TransferHistory = {}
}

