/**
 * @module lib/constants.ts Constants used throughout the Pins extension, including storage keys, keyboard shortcuts, and sorting strategies.
 *
 * @summary Constants used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:31:40
 * Last modified  : 2023-09-04 17:47:55
 */

import { Keyboard } from "@raycast/api";

/**
 * Storage keys used throughout the extension.
 */
export enum StorageKey {
  /**
   * The list of stored pins.
   */
  LOCAL_PINS = "localPins",

  /**
   * The list of stored groups.
   */
  LOCAL_GROUPS = "localGroups",

  /**
   * The ID of the next pin to be created. This is generally the highest ID in the list of pins, but it is not guaranteed. It is used to ensure that each pin has a unique ID.
   */
  NEXT_PIN_ID = "nextPinID",

  /**
   * The ID of the next group to be created. This is generally the highest ID in the list of groups, but it is not guaranteed. It is used to ensure that each group has a unique ID.
   */
  NEXT_GROUP_ID = "nextGroupID",

  /**
   * The list of recently used applications. This is used to cache the list of applications so that it does not need to be fetched every time the list of pins is displayed.
   */
  RECENT_APPS = "recentApplications",

  /**
   * Whether or not the user has installed the example pins.
   */
  EXAMPLES_INSTALLED = "examplesInstalled",

  /**
   * UUID placeholders used thus far.
   */
  USED_UUIDS = "usedUUIDs",

  /**
   * The ID of the pin that was most recently opened.
   */
  LAST_OPENED_PIN = "lastOpenedPin",

  /**
   * The list of persistent variables, their current values, and their default (initial) values.
   */
  PERSISTENT_VARS = "persistentVars",

  /**
   * The list of delayed executions, their targets, and their due dates.
   */
  DELAYED_EXECUTIONS = "delayedExecutions",
}

/**
 * Reserved shortcuts used throughout the extension.
 */
export const KEYBOARD_SHORTCUT: { [key: string]: Keyboard.Shortcut } = {
  PIN_CURRENT_APP: { modifiers: ["cmd", "shift"], key: "a" },
  PIN_CURRENT_DIRECTORY: { modifiers: ["cmd", "shift"], key: "d" },
  PIN_CURRENT_TAB: { modifiers: ["cmd", "shift"], key: "t" },
  PIN_ALL_TABS: { modifiers: ["cmd", "shift"], key: "g" },
  PIN_SELECTED_TEXT: { modifiers: ["cmd", "shift"], key: "s" },
  PIN_SELECTED_FILES: { modifiers: ["cmd", "shift"], key: "f" },
  PIN_CURRENT_DOCUMENT: { modifiers: ["cmd", "shift"], key: "e" },
  PIN_SELECTED_NOTES: { modifiers: ["cmd", "shift"], key: "n" },

  CREATE_NEW_PIN: { modifiers: ["cmd"], key: "n" },
  COPY_PINS_JSON: { modifiers: ["cmd"], key: "j" },
  OPEN_PLACEHOLDERS_GUIDE: { modifiers: ["cmd"], key: "g" },
  OPEN_PREFERENCES: { modifiers: ["cmd"], key: "," },
};

/**
 * Sorting strategies and their display names.
 */
export const SORT_STRATEGY: { [key: string]: string } = {
  alphabetical: "Alphabetical",
  dateCreated: "Creation Date",
  frequency: "Frequency",
  manual: "Manual",
  recency: "Recency",
};

/**
 * Directions in which pins and groups can be moved.
 */
export enum Direction {
  DOWN,
  UP,
}
