/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Server URL - The URL of your PwPush server. Leave empty to use the public https://eu.pwpush.com service. */
  "serverUrl"?: string,
  /** API Key - Your PwPush API key. Required for paid or self-hosted instances with authentication. */
  "apiKey"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `create-push` command */
  export type CreatePush = ExtensionPreferences & {}
  /** Preferences accessible in the `push-history` command */
  export type PushHistory = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `create-push` command */
  export type CreatePush = {}
  /** Arguments passed to the `push-history` command */
  export type PushHistory = {}
}

