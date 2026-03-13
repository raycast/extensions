/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Public API Key - Your password.link public API key (found in Account Settings > API Keys) */
  "publicKey": string,
  /** Private API Key - Your password.link private API key (found in Account Settings > API Keys) */
  "privateKey": string,
  /** Base URL - Your password.link domain (e.g., https://password.link or your custom domain) */
  "baseUrl": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `new-secret` command */
  export type NewSecret = ExtensionPreferences & {}
  /** Preferences accessible in the `list-secrets` command */
  export type ListSecrets = ExtensionPreferences & {}
  /** Preferences accessible in the `new-secret-request` command */
  export type NewSecretRequest = ExtensionPreferences & {}
  /** Preferences accessible in the `list-secret-requests` command */
  export type ListSecretRequests = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `new-secret` command */
  export type NewSecret = {
  /** Message */
  "message": string,
  /** Content */
  "secret": string
}
  /** Arguments passed to the `list-secrets` command */
  export type ListSecrets = {}
  /** Arguments passed to the `new-secret-request` command */
  export type NewSecretRequest = {}
  /** Arguments passed to the `list-secret-requests` command */
  export type ListSecretRequests = {}
}

