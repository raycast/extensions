/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Workspace Path - Select your workspace directory */
  "workspacePath": string,
  /** Search Depth - How deep to search for subdirectories */
  "maxDepth": "1" | "2" | "3" | "4" | "5",
  /** Application - Select an application to open folders */
  "appChoice": "vscode" | "opencode" | "antigravity" | "cursor" | "zed" | "webstorm" | "idea" | "sublime" | "custom",
  /** Custom Application Path - Path to custom application (only used when 'Custom' is selected) */
  "customAppPath"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `z` command */
  export type Z = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `z` command */
  export type Z = {
  /** directory */
  "query": string
}
}

