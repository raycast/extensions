/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Action After Conversion - Paste the result or copy the result to the clipboard after converting text. */
  "actionAfterConversion"?: "Paste" | "Copy"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `simplified-to-traditional` command */
  export type SimplifiedToTraditional = ExtensionPreferences & {
  /**  - Simplified Chinese quotation marks ‘’ / “” to Traditional Chinese quotation marks 「」/『』. */
  "simplifiedToTraditionalQuoteStyle": boolean
}
  /** Preferences accessible in the `traditional-to-simplified` command */
  export type TraditionalToSimplified = ExtensionPreferences & {
  /**  - Traditional Chinese quotation marks 「」/『』 to Simplified Chinese quotation marks ‘’ / “”. */
  "traditionalToSimplifiedQuoteStyle": boolean
}
  /** Preferences accessible in the `chinese-to-pinyin` command */
  export type ChineseToPinyin = ExtensionPreferences & {
  /** Tones - Pinyin tones symbol display form. */
  "tones": "none" | "sym" | "num"
}
}

declare namespace Arguments {
  /** Arguments passed to the `simplified-to-traditional` command */
  export type SimplifiedToTraditional = {}
  /** Arguments passed to the `traditional-to-simplified` command */
  export type TraditionalToSimplified = {}
  /** Arguments passed to the `chinese-to-pinyin` command */
  export type ChineseToPinyin = {}
}
