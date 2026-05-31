/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** MiToDos Directory - Directory for MiToDos markdown files (default: ~/MiToDos/) */
  "mitodosDir": string,
  /** Wiki Vault Path - Root of your Obsidian wiki vault (optional, for QMD search) */
  "wikiPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `append-task` command */
  export type AppendTask = ExtensionPreferences & {}
  /** Preferences accessible in the `create-project` command */
  export type CreateProject = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `append-task` command */
  export type AppendTask = {
  /** Task description... */
  "text": string
}
  /** Arguments passed to the `create-project` command */
  export type CreateProject = {
  /** Project name */
  "name": string
}
  /** Arguments passed to the `search` command */
  export type Search = {
  /** Search your tasks and knowledge base... */
  "query": string
}
}

