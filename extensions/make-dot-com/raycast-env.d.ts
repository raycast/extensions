/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Make Base URL - Full Make base URL, e.g. https://eu1.make.com */
  "baseUrl": string,
  /** Make API Token - Used as Authorization header (we send: Authorization: Token <token>) */
  "apiToken": string,
  /** undefined - Show creator/updater email addresses in scenario details (may be sensitive). */
  "showUserEmails": boolean,
  /** undefined - Allow showing/copying execution outputs and error JSON (may contain secrets/PII). */
  "allowCopyExecutionPayloads": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `list-scenarios` command */
  export type ListScenarios = ExtensionPreferences & {}
  /** Preferences accessible in the `list-favorite-scenarios` command */
  export type ListFavoriteScenarios = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-scenarios` command */
  export type ListScenarios = {}
  /** Arguments passed to the `list-favorite-scenarios` command */
  export type ListFavoriteScenarios = {}
}

