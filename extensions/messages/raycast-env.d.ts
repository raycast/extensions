/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `open-chat` command */
  export type OpenChat = ExtensionPreferences & {}
  /** Preferences accessible in the `my-messages` command */
  export type MyMessages = ExtensionPreferences & {
  /** undefined - When enabled, messages labeled as spam will not be shown. */
  "filterSpam": boolean,
  /** undefined - When enabled, messages from unknown senders will not be shown. */
  "filterUnknownSenders": boolean
}
  /** Preferences accessible in the `send-message` command */
  export type SendMessage = ExtensionPreferences & {
  /** undefined - When enabled, the Raycast window is closed immediately, allowing you to carry on with other work. */
  "shouldCloseMainWindow": boolean
}
  /** Preferences accessible in the `unread-messages` command */
  export type UnreadMessages = ExtensionPreferences & {
  /** undefined - When enabled, messages labeled as spam will not be shown in the menu bar. */
  "filterSpam": boolean,
  /** undefined - When enabled, messages from unknown senders will not be shown in the menu bar. */
  "filterUnknownSenders": boolean
}
  /** Preferences accessible in the `paste-latest-otp-code` command */
  export type PasteLatestOtpCode = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `open-chat` command */
  export type OpenChat = {}
  /** Arguments passed to the `my-messages` command */
  export type MyMessages = {}
  /** Arguments passed to the `send-message` command */
  export type SendMessage = {}
  /** Arguments passed to the `unread-messages` command */
  export type UnreadMessages = {}
  /** Arguments passed to the `paste-latest-otp-code` command */
  export type PasteLatestOtpCode = {}
}

declare module "swift:*/contacts" {
  export function fetchContactsForPhoneNumbers(phoneNumbers: string[]): Promise<any[]>;

  export class SwiftError extends Error {
    stderr: string;
    stdout: string;
  }
}

declare module "swift:*/contacts" {
  export function fetchContactsForPhoneNumbers(phoneNumbers: string[]): Promise<any[]>;

  export class SwiftError extends Error {
    stderr: string;
    stdout: string;
  }
}