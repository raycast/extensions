/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Type - Your app type */
  "type": "feishu" | "lark" | "self-hosted",
  /** Self-hosted domain - The self-hosted domain of your enterprise. For example: mycompany.com */
  "selfHostedDomain"?: string,
  /** Recent List Count - Items count when fetching recent list */
  "recentListCount": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-docs` command */
  export type SearchDocs = ExtensionPreferences & {}
  /** Preferences accessible in the `search-minutes` command */
  export type SearchMinutes = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-docs` command */
  export type SearchDocs = {}
  /** Arguments passed to the `search-minutes` command */
  export type SearchMinutes = {}
}

