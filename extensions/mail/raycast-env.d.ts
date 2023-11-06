/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Primary Action - The primary action to be performed on the selected message. */
  "primaryAction": "seeMessage" | "openMessage",
  /** Save Attachments To - Directory to save mail attachments. */
  "saveDirectory": string,
  /** Message Limit - The amount of messages to retrieve. */
  "messageLimit": "5" | "10" | "25" | "50" | "100"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `check-for-mail` command */
  export type CheckForMail = ExtensionPreferences & {}
  /** Preferences accessible in the `compose-new-message` command */
  export type ComposeNewMessage = ExtensionPreferences & {}
  /** Preferences accessible in the `see-recent-mail` command */
  export type SeeRecentMail = ExtensionPreferences & {}
  /** Preferences accessible in the `see-important-mail` command */
  export type SeeImportantMail = ExtensionPreferences & {}
  /** Preferences accessible in the `see-mail-accounts` command */
  export type SeeMailAccounts = ExtensionPreferences & {}
  /** Preferences accessible in the `share-with-mail` command */
  export type ShareWithMail = ExtensionPreferences & {}
  /** Preferences accessible in the `refresh-mail` command */
  export type RefreshMail = ExtensionPreferences & {}
  /** Preferences accessible in the `clear-cache` command */
  export type ClearCache = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `check-for-mail` command */
  export type CheckForMail = {}
  /** Arguments passed to the `compose-new-message` command */
  export type ComposeNewMessage = {}
  /** Arguments passed to the `see-recent-mail` command */
  export type SeeRecentMail = {}
  /** Arguments passed to the `see-important-mail` command */
  export type SeeImportantMail = {}
  /** Arguments passed to the `see-mail-accounts` command */
  export type SeeMailAccounts = {}
  /** Arguments passed to the `share-with-mail` command */
  export type ShareWithMail = {}
  /** Arguments passed to the `refresh-mail` command */
  export type RefreshMail = {}
  /** Arguments passed to the `clear-cache` command */
  export type ClearCache = {}
}
