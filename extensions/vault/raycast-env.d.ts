/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Vault url - Vault url */
  "url"?: string,
  /** Login method - Login method (ldap, token) */
  "loginMethod": "ldap" | "token",
  /** Ldap - Ldap identifier (only for ldap method) */
  "ldap": string,
  /** Password - Ldap password (only for ldap method) */
  "password": string,
  /** Token - Token (only for token method) */
  "token": string,
  /** Technical paths - Technical paths to hide, separated by space */
  "technicalPaths": string,
  /** Favorite namespaces - Favorite namespaces, separated by space (for easy switch) */
  "favoriteNamespaces": string,
  /** Enable write - Enable write */
  "enableWrite"?: boolean,
  /** Enable delete - Enable delete */
  "enableDelete"?: boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `vault` command */
  export type Vault = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `vault` command */
  export type Vault = {}
}
