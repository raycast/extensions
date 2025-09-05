/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** TBA API Key - Your The Blue Alliance API Key. Get one at https://www.thebluealliance.com/account */
  "tbaApiKey": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `frc-team` command */
  export type FrcTeam = ExtensionPreferences & {}
  /** Preferences accessible in the `frc-event` command */
  export type FrcEvent = ExtensionPreferences & {}
  /** Preferences accessible in the `ftc-team` command */
  export type FtcTeam = ExtensionPreferences & {}
  /** Preferences accessible in the `ftc-search` command */
  export type FtcSearch = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `frc-team` command */
  export type FrcTeam = {
  /** Team Number */
  "team": string,
  /** Year */
  "year": string
}
  /** Arguments passed to the `frc-event` command */
  export type FrcEvent = {
  /** Event ID */
  "event": string
}
  /** Arguments passed to the `ftc-team` command */
  export type FtcTeam = {
  /** Team Number */
  "team": string
}
  /** Arguments passed to the `ftc-search` command */
  export type FtcSearch = {}
}

