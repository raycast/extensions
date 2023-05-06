/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /**  - Automatically detects selected text or clipboard when opening commands. */
  "autoDetect"?: boolean,
  /** Priority detection - Priority detection of selected text or clipboard. */
  "priorityDetection"?: "selected" | "clipboard"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `base-converter` command */
  export type BaseConverter = ExtensionPreferences & {
  /**  - In the advanced view, you can freely choose the bases of mutual conversion. */
  "advanceView"?: boolean,
  /** Advance View Location - Select the location of the advanced view: top or bottom. */
  "advanceViewLocation"?: "Top" | "Bottom"
}
  /** Preferences accessible in the `code-converter` command */
  export type CodeConverter = ExtensionPreferences & {}
  /** Preferences accessible in the `byte-converter` command */
  export type ByteConverter = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `base-converter` command */
  export type BaseConverter = {}
  /** Arguments passed to the `code-converter` command */
  export type CodeConverter = {}
  /** Arguments passed to the `byte-converter` command */
  export type ByteConverter = {}
}
