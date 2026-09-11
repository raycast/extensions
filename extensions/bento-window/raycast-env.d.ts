/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Target App Names (Comma-Separated) - Apps to tile with Auto Tile, tried in order. Example: Ghostty, Terminal, iTerm2. Leave empty to auto-detect from the focused window. */
  "appName": string,
  /** Excluded App Names (Comma-Separated) - Apps that are never tiled, even by Auto Tile All. Example: Music, Photos. */
  "excludeApps": string,
  /** Window Gap (px) - Spacing between tiles and screen edges. 0 means flush tiles (default). */
  "gap": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `tile` command */
  export type Tile = ExtensionPreferences & {}
  /** Preferences accessible in the `tile-all` command */
  export type TileAll = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `tile` command */
  export type Tile = {}
  /** Arguments passed to the `tile-all` command */
  export type TileAll = {}
}

