/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Menu bar - Show the Peon Ping status in the menu bar. */
  "showMenuBarIcon": boolean,
  /** Claude config directory - Optional override for the Claude config directory. When empty, CLAUDE_CONFIG_DIR or ~/.claude is used. */
  "claudeConfigDir"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `toggle-peon-ping` command */
  export type TogglePeonPing = ExtensionPreferences & {}
  /** Preferences accessible in the `peon-ping-menu-bar` command */
  export type PeonPingMenuBar = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `toggle-peon-ping` command */
  export type TogglePeonPing = {}
  /** Arguments passed to the `peon-ping-menu-bar` command */
  export type PeonPingMenuBar = {}
}

