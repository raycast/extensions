/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your Cursor API key */
  "apiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `launch-agent` command */
  export type LaunchAgent = ExtensionPreferences & {}
  /** Preferences accessible in the `list-agents` command */
  export type ListAgents = ExtensionPreferences & {}
  /** Preferences accessible in the `menu-bar` command */
  export type MenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `launch-agent` command */
  export type LaunchAgent = {}
  /** Arguments passed to the `list-agents` command */
  export type ListAgents = {}
  /** Arguments passed to the `menu-bar` command */
  export type MenuBar = {}
}

