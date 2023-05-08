/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Primary To-Do List App - Choose your primary to-do list app. New tasks will be created in this app, and its keyboard shortcut scheme will be used. */
  "primaryTodoSource": "reminders" | "things" | "todoist",
  /** Additional To-Do List App - Select an additional to-do list app to source tasks from, alongside your primary app. */
  "secondaryTodoSource"?: "none" | "reminders" | "things" | "todoist",
  /** Additional To-Do List App - Select an additional to-do list app to source tasks from, alongside your primary app. */
  "tertiaryTodoSource"?: "none" | "reminders" | "things" | "todoist",
  /** Todoist API Token - If you chose Todoist as one of your to-do list apps, copy and paste your API token here. You can find it in Todoist Settings > Integrations > Developer. */
  "todoistAPIToken"?: string,
  /** Time Block Calendar - Enter the name of the calendar where your time blocks should be placed. If this calendar doesn't exist, you'll see an option to create it when launching a command. */
  "blockCalendar": string,
  /** Event Calendars - Enter the names of calendars, separated by commas without leading or trailing spaces, containing events that should not conflict with your time blocks. */
  "eventCalendars"?: string,
  /** Time Tracking App - Choose the time tracking app to use for logging time entries. */
  "timeTrackingApp"?: "calendar" | "Toggl" | "Clockify",
  /** Calendar for Time Tracking - If you selected Calendar as your Time Tracking App, enter the name of the calendar where your time entries should be placed. If this calendar doesn't exist, you'll see an option to create it when launching a command. */
  "timeEntryCalendar"?: string,
  /** Time Tracking App API Key - If you selected Toggl or Clockify as your Time Tracking App, enter the API key to access your data stored in the chosen app. */
  "timeTrackerAPIKey"?: string,
  /**  - If you selected Toggl or Clockify as your Time Tracking App, enable this option to sync projects from your to-do list app to your time tracking app (one-way sync). */
  "isSyncingProjects"?: boolean,
  /**  - If you selected Toggl or Clockify as your Time Tracking App, enable this option to sync tags from your to-do list app to your time tracking app (one-way sync). */
  "isSyncingTags"?: boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `block-time` command */
  export type BlockTime = ExtensionPreferences & {
  /** Default Time Block Duration - Default length for calendar events created for to-dos */
  "defaultBlockDuration"?: "900000" | "1800000" | "2700000" | "3600000" | "5400000" | "7200000",
  /** Working Hours Start Time - The earliest time of the day at which time block scheduling suggestions should start */
  "workingHoursStart"?: string,
  /** Working Hours End Time - The latest time of the day at which time block scheduling suggestions should end */
  "workingHoursEnd"?: string,
  /** Time Block Alert Timing - Your preferred timing for alerts about upcoming time blocks */
  "alarmOffset"?: "missing value" | "0" | "-60" | "-120" | "-300" | "-600",
  /** Task Block Name - Default title for a calendar event representing a block of time set aside for multiple small tasks */
  "taskBlockName"?: string,
  /** Break Block Name - Default title for a calendar event representing a block of time set aside for relaxation */
  "breakBlockName"?: string,
  /**  - If a task is time-blocked for a date earlier than its start date (Reminders/Things) or due date (Todoist), update the start/due date to the time-blocked date. */
  "isReschedulingOnTimeblocking"?: boolean
}
  /** Preferences accessible in the `track-time` command */
  export type TrackTime = ExtensionPreferences & {
  /**  - If a timer for a task is started earlier than its start date (Reminders/Things) or due date (Todoist), update the start/due date to the current date. */
  "isReschedulingOnTimeTracking"?: boolean
}
  /** Preferences accessible in the `generate-productivity-reports` command */
  export type GenerateProductivityReports = ExtensionPreferences & {
  /**  - Exclude to-dos, calendar events, and time entries occurring on Saturdays and Sundays from the generated reports. */
  "excludeWeekends"?: boolean,
  /**  - Include incomplete to-dos that have not been assigned a time block or tracked in the generated reports. */
  "showUnscheduledOpenTodos"?: boolean,
  /**  - Group to-dos based on whether they were completed as scheduled (with assigned time/task blocks) or spontaneously (without assigned time/task blocks). */
  "groupBySpontaneity"?: boolean
}
  /** Preferences accessible in the `show-menu-bar-timer` command */
  export type ShowMenuBarTimer = ExtensionPreferences & {
  /**  - Display the timer in the menu bar without the title. */
  "hideTimerTitle"?: boolean
}
  /** Preferences accessible in the `split-screen` command */
  export type SplitScreen = ExtensionPreferences & {
  /** Window Size Ratio - Specify the ratio between the widths of the to-do app window and the calendar window when displayed side by side. */
  "splitRatio"?: "1 / 3" | "0.5" | "2 / 3"
}
}

declare namespace Arguments {
  /** Arguments passed to the `block-time` command */
  export type BlockTime = {}
  /** Arguments passed to the `track-time` command */
  export type TrackTime = {}
  /** Arguments passed to the `generate-productivity-reports` command */
  export type GenerateProductivityReports = {}
  /** Arguments passed to the `show-menu-bar-timer` command */
  export type ShowMenuBarTimer = {}
  /** Arguments passed to the `split-screen` command */
  export type SplitScreen = {}
}
