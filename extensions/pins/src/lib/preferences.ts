/**
 * @module lib/preferences.ts Preference types and utilities for Pins commands.
 *
 * @summary Pin command preferences.
 * @author Stephen Kaplan <skaplanofficial@gmail.com>
 *
 * Created at     : 2023-09-04 17:37:42
 * Last modified  : 2023-11-01 00:17:40
 */

import { Application } from "@raycast/api";

/**
 * Preferences for the entire extension.
 */

export interface ExtensionPreferences {
  /**
   * The user's preferred browser. This is used to open URL pins.
   */
  preferredBrowser: Application;

  /**
   * The first section displayed in lists of pins, e.g. grouped-pins-first or ungrouped-pins-first.
   */
  topSection: string;

  /**
   * Whether or not to show the recent applications section in lists of pins.
   */
  showRecentApplications: boolean;

  /**
   * The default sort strategy for lists of pins outside of groups.
   */
  defaultSortStrategy: string;
}

/**
 * Preferences for the menu bar extra.
 */
export interface PinsMenubarPreferences {
  /**
   * The color of the Pins icon in the menu bar.
   */
  iconColor: string;

  /**
   * Whether to show category labels (e.g. "Pins", "Groups", "Quick Pins") in the menu bar dropdown.
   */
  showCategories: boolean;

  /**
   * Whether to show the "Open All" button within group submenus.
   */
  showOpenAll: boolean;

  /**
   * Whether to show the "Create New Pin" button.
   */
  showCreateNewPin: boolean;

  /**
   * Whether to show the "Copy Pin Data" button.
   */
  showCopyPinData: boolean;

  /**
   * Whether to show the "Quick Pins" section.
   */
  showPinShortcut: boolean;

  /**
   * Whether to show the "Open Placeholders Guide" button.
   */
  showOpenPlaceholdersGuide: boolean;

  /**
   * Whether to show the "Preferences..." button.
   */
  showPreferences: boolean;

  /**
   * Whether to display pins that are not applicable to the current context. For example, if this is disabled, pins requiring selected text will not be shown if no text is selected.
   */
  showInapplicablePins: boolean;

  /**
   * The action to perform when a pin menu item is right-clicked.
   */
  rightClickAction: "open" | "delete";
}

/**
 * Preferences for the View Pins command.
 */
export interface ViewPinsPreferences {
  /**
   * Whether to display groups as separate sections.
   */
  showGroups: boolean;

  /**
   * Whether to display subtitles for pins.
   */
  showSubtitles: boolean;

  /**
   * Whether to display icons for applications that pins open with, if one is specified.
   */
  showApplication: boolean;

  /**
   * Whether to display a the initial creation date of each pin.
   */
  showCreationDate: boolean;

  /**
   * Whether to display the expiration date for pins that have one.
   */
  showExpiration: boolean;

  /**
   * Whether to display the execution visibility for Terminal command pins.
   */
  showExecutionVisibility: boolean;

  /**
   * Whether to display an icon accessory for text fragments.
   */
  showFragment: boolean;

  /**
   * Whether to display the number of times a pin has been opened.
   */
  showFrequency: boolean;

  /**
   * Whether to display an indicator for the most recently opened pin.
   */
  showLastOpened: boolean;
}

/**
 * Preferences for the view groups command.
 */
export type ViewGroupsPreferences = {
  /**
   * Whether to display the ID of each group as an accessory.
   */
  showIDs: boolean;

  /**
   * Whether to display the current sort strategy of each group as an accessory.
   */
  showSortStrategy: boolean;

  /**
   * Whether to display the parent group of each group as an accessory.
   */
  showParentGroup: boolean;
};

/**
 * Preferences for the Copy Pins Data command.
 */
export type CopyPinsPreferences = {
  /**
   * A directory to export pins to, if any. By default, pins are copied to the clipboard.
   */
  exportLocation: string;

  /**
   * The format to export pins in. Either "csv" or "json" (default).
   */
  exportFormat: string;
};
