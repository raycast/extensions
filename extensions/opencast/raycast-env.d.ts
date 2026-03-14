/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Server URL - Optional override. Leave empty to auto-discover a running OpenCode server. */
  "serverUrl"?: string,
  /** Username - Optional basic auth username */
  "username"?: string,
  /** Password - Optional basic auth password */
  "password"?: string,
  /** Default Directory - Optional default repo path to use when no recent target exists */
  "defaultDirectory"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `open-opencode` command */
  export type OpenOpencode = ExtensionPreferences & {}
  /** Preferences accessible in the `ask-opencode` command */
  export type AskOpencode = ExtensionPreferences & {}
  /** Preferences accessible in the `switch-opencode-target` command */
  export type SwitchOpencodeTarget = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `open-opencode` command */
  export type OpenOpencode = {}
  /** Arguments passed to the `ask-opencode` command */
  export type AskOpencode = {}
  /** Arguments passed to the `switch-opencode-target` command */
  export type SwitchOpencodeTarget = {}
}
