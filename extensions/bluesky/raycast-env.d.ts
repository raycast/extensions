/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Bluesky Service URL - Service URL */
  "service": string,
  /** Bluesky Email or Handle - Your Bluesky email or handle */
  "accountId": string,
  /** App Password - Your App Password */
  "password": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `menu-bar-notifications` command */
  export type MenuBarNotifications = ExtensionPreferences & {}
  /** Preferences accessible in the `home` command */
  export type Home = ExtensionPreferences & {}
  /** Preferences accessible in the `timeline` command */
  export type Timeline = ExtensionPreferences & {}
  /** Preferences accessible in the `search` command */
  export type Search = ExtensionPreferences & {}
  /** Preferences accessible in the `new-post` command */
  export type NewPost = ExtensionPreferences & {}
  /** Preferences accessible in the `notifications` command */
  export type Notifications = ExtensionPreferences & {}
  /** Preferences accessible in the `recent-posts` command */
  export type RecentPosts = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `menu-bar-notifications` command */
  export type MenuBarNotifications = {}
  /** Arguments passed to the `home` command */
  export type Home = {}
  /** Arguments passed to the `timeline` command */
  export type Timeline = {}
  /** Arguments passed to the `search` command */
  export type Search = {
  /** person or entity */
  "searchTerm": string
}
  /** Arguments passed to the `new-post` command */
  export type NewPost = {}
  /** Arguments passed to the `notifications` command */
  export type Notifications = {}
  /** Arguments passed to the `recent-posts` command */
  export type RecentPosts = {
  /** @handle */
  "handle": string
}
}

