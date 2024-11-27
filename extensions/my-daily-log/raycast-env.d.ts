/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Daily Log Path - Path to your daily log */
  "logPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `dailyLogList` command */
  export type DailyLogList = ExtensionPreferences & {}
  /** Preferences accessible in the `loggedDaysInMonthList` command */
  export type LoggedDaysInMonthList = ExtensionPreferences & {}
  /** Preferences accessible in the `createLogCommand` command */
  export type CreateLogCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `summaryOfAMonth` command */
  export type SummaryOfAMonth = ExtensionPreferences & {}
  /** Preferences accessible in the `daySummaryView` command */
  export type DaySummaryView = ExtensionPreferences & {}
  /** Preferences accessible in the `dailyStandupSpeechView` command */
  export type DailyStandupSpeechView = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `dailyLogList` command */
  export type DailyLogList = {
  /** When (y, 2022-12-31) */
  "date": string
}
  /** Arguments passed to the `loggedDaysInMonthList` command */
  export type LoggedDaysInMonthList = {}
  /** Arguments passed to the `createLogCommand` command */
  export type CreateLogCommand = {
  /** Title */
  "title": string
}
  /** Arguments passed to the `summaryOfAMonth` command */
  export type SummaryOfAMonth = {}
  /** Arguments passed to the `daySummaryView` command */
  export type DaySummaryView = {}
  /** Arguments passed to the `dailyStandupSpeechView` command */
  export type DailyStandupSpeechView = {}
}
