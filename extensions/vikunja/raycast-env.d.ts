/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Vikunja URL - Base URL of your Vikunja instance (e.g. https://tasks.example.com) */
  "apiUrl": string,
  /** API Token - Vikunja API token for authentication */
  "apiToken": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `create-task` command */
  export type CreateTask = ExtensionPreferences & {}
  /** Preferences accessible in the `list-tasks` command */
  export type ListTasks = ExtensionPreferences & {}
  /** Preferences accessible in the `list-projects` command */
  export type ListProjects = ExtensionPreferences & {}
  /** Preferences accessible in the `search-tasks` command */
  export type SearchTasks = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `create-task` command */
  export type CreateTask = {
  /** Task title */
  "title": string
}
  /** Arguments passed to the `list-tasks` command */
  export type ListTasks = {}
  /** Arguments passed to the `list-projects` command */
  export type ListProjects = {}
  /** Arguments passed to the `search-tasks` command */
  export type SearchTasks = {}
}

