/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** General Settings - Whether to show high-level categories in the menu dropdown. */
  "showCategories"?: boolean,
  /**  - Whether to show a "Pin This" item in the menu dropdown. */
  "showPinShortcut"?: boolean,
  /**  - Whether to show an "Open All" item in group submenus. */
  "showOpenAll"?: boolean,
  /** Preferred Browser - The browser to use when opening URLs. */
  "preferredBrowser"?: import("@raycast/api").Application
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `new-pin` command */
  export type NewPin = ExtensionPreferences & {}
  /** Preferences accessible in the `new-group` command */
  export type NewGroup = ExtensionPreferences & {}
  /** Preferences accessible in the `view-pins` command */
  export type ViewPins = ExtensionPreferences & {}
  /** Preferences accessible in the `view-groups` command */
  export type ViewGroups = ExtensionPreferences & {}
  /** Preferences accessible in the `copy-pins` command */
  export type CopyPins = ExtensionPreferences & {}
  /** Preferences accessible in the `import-data` command */
  export type ImportData = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `new-pin` command */
  export type NewPin = {}
  /** Arguments passed to the `new-group` command */
  export type NewGroup = {}
  /** Arguments passed to the `view-pins` command */
  export type ViewPins = {}
  /** Arguments passed to the `view-groups` command */
  export type ViewGroups = {}
  /** Arguments passed to the `copy-pins` command */
  export type CopyPins = {}
  /** Arguments passed to the `import-data` command */
  export type ImportData = {}
}
