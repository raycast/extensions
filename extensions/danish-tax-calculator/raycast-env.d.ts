/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Percentage - Percentage */
  "defaultPercentage": string,
  /** Default Action - Default Action */
  "defaultAction": "copy" | "paste"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `calculate-payment` command */
  export type CalculatePayment = ExtensionPreferences & {}
  /** Preferences accessible in the `view-history` command */
  export type ViewHistory = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `calculate-payment` command */
  export type CalculatePayment = {
  /** Income */
  "income": string,
  /** Percentage */
  "drawPercentage": string,
  /** Deduction */
  "deduction": string
}
  /** Arguments passed to the `view-history` command */
  export type ViewHistory = {}
}

