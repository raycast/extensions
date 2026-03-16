/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Default WSL Distro - Name of the WSL distribution to use (e.g., Ubuntu). Leave empty to use the WSL default. */
  "defaultDistro"?: string,
  /** Working Directory - Default working directory inside WSL (e.g., ~ or /home/user/projects). Defaults to ~ if empty. */
  "workingDirectory": string,
  /** Shell History Source - Which shell history file to read from WSL */
  "shellType": "bash" | "zsh" | "fish"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `execute-command` command */
  export type ExecuteCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `list-distros` command */
  export type ListDistros = ExtensionPreferences & {}
  /** Preferences accessible in the `open-terminal` command */
  export type OpenTerminal = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `execute-command` command */
  export type ExecuteCommand = {
  /** Command */
  "command": string
}
  /** Arguments passed to the `list-distros` command */
  export type ListDistros = {}
  /** Arguments passed to the `open-terminal` command */
  export type OpenTerminal = {}
}

