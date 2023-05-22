/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Client ID - The client_id value seen in the My Account section of a Bitwarden web vault. */
  "clientId": string,
  /** Client Secret - The client_secret value seen in the My Account section of a Bitwarden web vault. */
  "clientSecret": string,
  /** Vault Timeout - The amount of time before the password must be re-entered to access the vault again. */
  "repromptIgnoreDuration"?: "0" | "60000" | "300000" | "900000" | "1800000" | "3600000" | "14400000" | "28800000" | "86400000" | "-1",
  /** Privacy - Whether to use a remote service owned by Bitwarden to fetch icons for vault items. If unchecked, built-in icons will be used. */
  "fetchFavicons": boolean,
  /** Bitwarden CLI Installation Path - Location of the local Bitwarden CLI installation. Defaults to '/usr/local/bin/bw' on Intel and '/opt/homebrew/bin/bw' on M1. */
  "cliPath"?: string,
  /** Bitwarden Server URL - Optional: URL to use for self-hosted servers. */
  "serverUrl"?: string,
  /** Self-signed Certificates Path - Advanced: Path to self-signed TLS certificate for self-hosted instances. */
  "serverCertsPath"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {
  /** Primary Action - The primary action to perform on a vault item. */
  "primaryAction"?: "paste" | "copy",
  /** Copy Values Temporarily - Whether values should be copied to the clipboard temporarily, and therefore omitted from the clipboard history */
  "transientCopySearch"?: "always" | "passwords" | "never",
  /** Improved Load Times - Whether to cache vault items for faster access. This will NOT cache the actual passwords and other sensitive values, only usernames/emails and other labels. */
  "shouldCacheVaultItems"?: boolean
}
  /** Preferences accessible in the `generate-password` command */
  export type GeneratePassword = ExtensionPreferences & {
  /** Copy Values Temporarily - Whether values should be copied to the clipboard temporarily, and therefore omitted from the clipboard history */
  "transientCopyGeneratePassword"?: "always" | "never"
}
  /** Preferences accessible in the `generate-password-quick` command */
  export type GeneratePasswordQuick = ExtensionPreferences & {
  /** Action to perform after generating - The action performed after generating the password. */
  "generatePasswordQuickAction"?: "paste" | "copy" | "copyAndPaste",
  /** Copy Values Temporarily - Whether values should be copied to the clipboard temporarily, and therefore omitted from the clipboard history */
  "transientCopyGeneratePasswordQuick"?: "always" | "never"
}
  /** Preferences accessible in the `lock-vault` command */
  export type LockVault = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search` command */
  export type Search = {}
  /** Arguments passed to the `generate-password` command */
  export type GeneratePassword = {}
  /** Arguments passed to the `generate-password-quick` command */
  export type GeneratePasswordQuick = {}
  /** Arguments passed to the `lock-vault` command */
  export type LockVault = {}
}
