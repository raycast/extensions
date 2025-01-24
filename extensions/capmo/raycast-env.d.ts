/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Capmo API Token - Your Capmo API Token */
  "capmoApiToken": string,
  /** Excluded Projects - Comma-separated list of project IDs to exclude */
  "excludedProjects"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `list-tickets` command */
  export type ListTickets = ExtensionPreferences & {}
  /** Preferences accessible in the `list-projects` command */
  export type ListProjects = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-tickets` command */
  export type ListTickets = {}
  /** Arguments passed to the `list-projects` command */
  export type ListProjects = {}
}

