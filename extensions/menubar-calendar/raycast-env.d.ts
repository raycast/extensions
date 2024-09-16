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
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {
  /** Week Start - Start day of the week */
  "weekStart": "1" | "0",
  /** Menubar Style - Show calendar icon and date in the menu bar */
  "menubarStyle": "both" | "iconOnly" | "dateOnly",
  /** Menubar Icon Style - Show different icon style in the menu bar */
  "menubarIconStyle": "Day" | "Calendar",
  /** Menubar Item Icon Style - Show different icon style in the menu bar item */
  "menubarItemIconStyle": "Raycast" | "Native" | "None",
  /** Show Events in Menubar - Show calendar events in the menu bar */
  "showEventsInMenubar": "0" | "0.16" | "0.33" | "0.5" | "1" | "6" | "-1",
  /** Title Max Length - Truncate length of the title */
  "titleTruncateLength": string,
  /** Calendar Style - Large calendar for more visibility */
  "largeCalendar": boolean,
  /**  - Highlight calendar for more visibility */
  "highlightCalendar": boolean,
  /**  - Show week number in the calendar */
  "showWeekNumber": boolean,
  /** Date Fromat - Choose the time format to display. */
  "dateFormat": "macOS" | "MM/dd/yyyy" | "dd/MM/yyyy" | "yyyy/MM/dd" | "yyyy-MM-dd" | "dd.MM.yyyy",
  /** Calendar View - Choose which calendar events you want to see in your menu bar. */
  "calendarView": "none" | "today" | "upcoming" | "all",
  /** Reminders View - Choose which reminder view you want to see in your menu bar. */
  "remindersView": "none" | "today" | "upcoming" | "all",
  /** Extra Items - Show Calendar in the menu bar item */
  "showCalendar": boolean,
  /**  - Show Reminders in the menu bar item */
  "showReminders": boolean,
  /**  - Show Settings in the menu bar item */
  "showSettings": boolean
}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}


declare module "swift:*/AppleReminders" {
  export function getData(): Promise<any>;
  export function getCompletedReminders(listId?: string | null): Promise<any[]>;
  export function createReminder(newReminder: any): Promise<any>;
  export function setTitleAndNotes(payload: any): Promise<void>;
  export function toggleCompletionStatus(reminderId: string): Promise<void>;
  export function setPriorityStatus(payload: any): Promise<void>;
  export function setDueDate(payload: any): Promise<void>;
  export function deleteReminder(reminderId: string): Promise<void>;
  export function setLocation(payload: any): Promise<void>;
  export function getCalendarEvents(days: number): Promise<any[]>;

	export class SwiftError extends Error {
		stderr: string;
		stdout: string;
	}
}