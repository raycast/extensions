/**
 * @module lib/constants.ts Constants used throughout the Pins extension, including storage keys, keyboard shortcuts, and sorting strategies.
 *
 * @summary Constants used throughout the extension.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:31:40
 * Last modified  : 2023-11-01 00:44:17
 */

import { Keyboard } from "@raycast/api";

export enum ItemType {
  PIN,
  GROUP,
}

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
  EXAMPLE_PINS_INSTALLED = "examplePinsInstalled",

  /**
   * Whether or not the user has installed the example groups.
   */
  EXAMPLE_GROUPS_INSTALLED = "exampleGroupsInstalled",

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
export const SORT_STRATEGY = {
  alphabetical: "Alphabetical",
  dateCreated: "Creation Date",
  frequency: "Frequency",
  manual: "Manual",
  recency: "Recency",
};

/**
 * Basic sorting functions.
 */
export const SORT_FN: { [key: string]: (a: unknown, b: unknown) => number } = {
  /**
   * Sorts by date created, with the oldest items first.
   */
  OLDEST: (a, b) => {
    const item1 = a as { dateCreated: string | undefined };
    const item2 = b as { dateCreated: string | undefined };
    return (
      (item1.dateCreated ? new Date(item1.dateCreated) : new Date(0)).getTime() -
      (item2.dateCreated ? new Date(item2.dateCreated) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by date created, with the newest items first.
   */
  NEWEST: (a, b) => {
    const item1 = a as { dateCreated: string | undefined };
    const item2 = b as { dateCreated: string | undefined };
    return (
      (item2.dateCreated ? new Date(item2.dateCreated) : new Date(0)).getTime() -
      (item1.dateCreated ? new Date(item1.dateCreated) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by number of times opened, with the most frequently opened items first.
   */
  MOST_FREQUENT: (a, b) => {
    const item1 = a as { timesOpened: number };
    const item2 = b as { timesOpened: number };
    return item2.timesOpened - item1.timesOpened;
  },

  /**
   * Sorts by number of times opened, with the least frequently opened items first.
   */
  LEAST_FREQUENT: (a, b) => {
    const item1 = a as { timesOpened: number };
    const item2 = b as { timesOpened: number };
    return item1.timesOpened - item2.timesOpened;
  },

  /**
   * Sorts by first opened date, with the oldest items first.
   */
  FIRST_OPENED: (a, b) => {
    const item1 = a as { firstOpened: string | undefined };
    const item2 = b as { firstOpened: string | undefined };
    return (
      (item1.firstOpened ? new Date(item1.firstOpened) : new Date(0)).getTime() -
      (item2.firstOpened ? new Date(item2.firstOpened) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by last opened date, with the most recently opened items first.
   */
  LAST_OPENED: (a, b) => {
    const item1 = a as { lastOpened: string | undefined };
    const item2 = b as { lastOpened: string | undefined };
    return (
      (item2.lastOpened ? new Date(item2.lastOpened) : new Date(0)).getTime() -
      (item1.lastOpened ? new Date(item1.lastOpened) : new Date(0)).getTime()
    );
  },

  /**
   * Sorts by average execution time, with the fastest items first.
   */
  FASTEST: (a, b) => {
    const item1 = a as { averageExecutionTime: number | undefined };
    const item2 = b as { averageExecutionTime: number | undefined };
    return (item1.averageExecutionTime || 0) - (item2.averageExecutionTime || 0);
  },

  /**
   * Sorts by average execution time, with the slowest items first.
   */
  SLOWEST: (a, b) => {
    const item1 = a as { averageExecutionTime: number | undefined };
    const item2 = b as { averageExecutionTime: number | undefined };
    return (item2.averageExecutionTime || 0) - (item1.averageExecutionTime || 0);
  },

  /**
   * Sorts alphabetically by name, with the items starting with A first.
   */
  ALPHA_ASC: (a, b) => {
    const item1 = a as { name: string };
    const item2 = b as { name: string };
    return item1.name.localeCompare(item2.name);
  },

  /**
   * Sorts alphabetically by name, with the items starting with Z first.
   */
  ALPHA_DESC: (a, b) => {
    const item1 = a as { name: string };
    const item2 = b as { name: string };
    return item2.name.localeCompare(item1.name);
  },
};

/**
 * Directions in which pins and groups can be moved.
 */
export enum Direction {
  DOWN,
  UP,
}
