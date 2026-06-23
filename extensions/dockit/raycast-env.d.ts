/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Python Path - Path to Python 3 with dockit installed */
  "pythonPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `format-word` command */
  export type FormatWord = ExtensionPreferences & {}
  /** Preferences accessible in the `convert-format` command */
  export type ConvertFormat = ExtensionPreferences & {}
  /** Preferences accessible in the `standardize-ppt` command */
  export type StandardizePpt = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `format-word` command */
  export type FormatWord = {}
  /** Arguments passed to the `convert-format` command */
  export type ConvertFormat = {
  /** Target format */
  "format": "csv" | "xlsx" | "txt"
}
  /** Arguments passed to the `standardize-ppt` command */
  export type StandardizePpt = {}
}

