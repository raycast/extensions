/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /**  - With this option turned on, you will receive notifications (through ntfy) in your mobile phone when a reminder time is up */
  "mobileNotificationNtfy"?: boolean,
  /** ntfy topic - Specify the topic you want to receive notifications in. Be precise e.g. simple_reminder_david_alecrim */
  "mobileNotificationNtfyTopic"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `reminderNotifications` command */
  export type ReminderNotifications = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `reminderNotifications` command */
  export type ReminderNotifications = {}
}
