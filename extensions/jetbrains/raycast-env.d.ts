/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Shell scripts location - Where are JetBrains Tools 'shell scripts' are installed (in Toolbox → Settings → Tools) */
  "bin": string,
  /** Tools Install location - What is the JetBrains Tools install Location? (in Toolbox → Settings → Tools) */
  "toolsInstall": string,
  /** Use protocol urls if missing shell scripts - Try to use the jetbrain://app-name protocol url to open projects if tools are not installed (not recommended) */
  "fallback": boolean,
  /** Use Frecency sorting for projects - Use Raycast's built in frecency sorting to order the list of projects */
  "frecencySorting": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `recent` command */
  export type Recent = ExtensionPreferences & {}
  /** Preferences accessible in the `recentMenu` command */
  export type RecentMenu = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `recent` command */
  export type Recent = {}
  /** Arguments passed to the `recentMenu` command */
  export type RecentMenu = {}
}

