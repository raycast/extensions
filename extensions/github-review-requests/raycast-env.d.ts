/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Authentication Method - PAT preserves the existing setup. GitHub CLI reuses your gh login and its existing organization access; it does not bypass SSO or organization policies. */
  "authMethod": "pat" | "gh",
  /** Personal Access Token - Used only when Authentication Method is Personal Access Token. Existing PAT users can keep their token; authorize it for SSO organizations where required. */
  "token"?: string,
  /** Organizations/Owners - Please specify the organizations or owners to include, separated by commas. */
  "owners"?: string,
  /** gh CLI Path - Absolute path to the GitHub CLI binary. Leave empty to auto-detect (Homebrew, /usr/local/bin, PATH). */
  "ghPath"?: string,
  /** GitHub Host - Use a GitHub Enterprise hostname to talk to a self-hosted instance. Defaults to github.com. */
  "host": string,
  /** Max Results per Category - How many pull requests to load per category. Higher values cost more GitHub API quota. */
  "maxResults": string,
  /** Background Activity Tracking - Opt in to populate the activity inbox in the background. Desktop notifications are configured separately and default to off. */
  "trackingEnabled": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `actionablePullRequests` command */
  export type ActionablePullRequests = ExtensionPreferences & {
  /** Menu Bar Layout - Keep the original review-status groups or show requests needing your review and reply. */
  "menuBarLayout": "classic" | "attention",
  /** Menu Bar Shows - Which category drives the menu bar count. */
  "menuBarCategory": "attention" | "review-requested" | "awaiting-reply" | "my-prs",
  /** Pull Requests Shown Inline - How many to list directly in the menu before the rest move into a “more” submenu. */
  "menuBarLimit": string,
  /** Menu Bar Icon - Remove the menu bar item entirely when the count is zero. */
  "hideWhenEmpty": boolean
}
  /** Preferences accessible in the `pull-requests` command */
  export type PullRequests = ExtensionPreferences & {}
  /** Preferences accessible in the `activity` command */
  export type Activity = ExtensionPreferences & {}
  /** Preferences accessible in the `watch` command */
  export type Watch = ExtensionPreferences & {}
  /** Preferences accessible in the `settings` command */
  export type Settings = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `actionablePullRequests` command */
  export type ActionablePullRequests = {}
  /** Arguments passed to the `pull-requests` command */
  export type PullRequests = {}
  /** Arguments passed to the `activity` command */
  export type Activity = {}
  /** Arguments passed to the `watch` command */
  export type Watch = {}
  /** Arguments passed to the `settings` command */
  export type Settings = {}
}

