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
  /** Preferences accessible in the `logReminder` command */
  export type LogReminder = ExtensionPreferences & {
  /** Enable Reminders - Periodically remind you to log your activity */
  "reminderEnabled"?: boolean,
  /** Working Hours Only - Only send reminders during working hours (e.g. 9 AM - 6 PM on weekdays) */
  "workingHoursOnly"?: boolean,
  /** Work Start Hour (0-23) - Starting hour for work reminders (24h format, default: 9) */
  "startHour"?: string,
  /** Work End Hour (0-23) - Ending hour for work reminders (24h format, default: 18) */
  "endHour"?: string,
  /** Inactivity Threshold (Minutes) - Only remind if no log was created in the last N minutes */
  "thresholdMinutes"?: string
}
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
  /** Arguments passed to the `logReminder` command */
  export type LogReminder = {}
}
