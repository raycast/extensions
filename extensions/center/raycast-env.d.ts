/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your Center API key. */
  "apiKey"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `get-contracts-of-owner` command */
  export type GetContractsOfOwner = ExtensionPreferences & {}
  /** Preferences accessible in the `get-asset` command */
  export type GetAsset = ExtensionPreferences & {}
  /** Preferences accessible in the `get-collection` command */
  export type GetCollection = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search` command */
  export type Search = {
  /** Search query... */
  "query": string
}
  /** Arguments passed to the `get-contracts-of-owner` command */
  export type GetContractsOfOwner = {
  /** ENS or contract address */
  "address": string
}
  /** Arguments passed to the `get-asset` command */
  export type GetAsset = {
  /** Contract Address */
  "address": string,
  /** Token ID */
  "tokenId": string
}
  /** Arguments passed to the `get-collection` command */
  export type GetCollection = {
  /** Contract Address */
  "address": string
}
}
