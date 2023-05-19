/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** First Language - First language */
  "lang1": "auto" | "af" | "sq" | "am" | "ar" | "hy" | "az" | "eu" | "be" | "bn" | "bs" | "bg" | "ca" | "ceb" | "zh-CN" | "zh-TW" | "co" | "hr" | "cs" | "da" | "nl" | "en" | "eo" | "et" | "fi" | "fr" | "fy" | "gl" | "ka" | "de" | "el" | "gu" | "ht" | "ha" | "haw" | "he" | "hi" | "hmn" | "hu" | "is" | "ig" | "id" | "ga" | "it" | "ja" | "jv" | "kn" | "kk" | "km" | "rw" | "ko" | "ku" | "ky" | "lo" | "lv" | "lt" | "lb" | "mk" | "mg" | "ms" | "ml" | "mt" | "mi" | "mr" | "mn" | "my" | "ne" | "no" | "ny" | "or" | "ps" | "fa" | "pl" | "pt" | "pa" | "ro" | "ru" | "sm" | "gd" | "sr" | "st" | "sn" | "sd" | "si" | "sk" | "sl" | "so" | "es" | "su" | "sw" | "sv" | "tl" | "tg" | "ta" | "tt" | "te" | "th" | "tr" | "tk" | "uk" | "ur" | "ug" | "uz" | "vi" | "cy" | "xh" | "yi" | "yo" | "zu",
  /** Second Language - Second language */
  "lang2": "af" | "sq" | "am" | "ar" | "hy" | "az" | "eu" | "be" | "bn" | "bs" | "bg" | "ca" | "ceb" | "zh-CN" | "zh-TW" | "co" | "hr" | "cs" | "da" | "nl" | "en" | "eo" | "et" | "fi" | "fr" | "fy" | "gl" | "ka" | "de" | "el" | "gu" | "ht" | "ha" | "haw" | "he" | "hi" | "hmn" | "hu" | "is" | "ig" | "id" | "ga" | "it" | "ja" | "jv" | "kn" | "kk" | "km" | "rw" | "ko" | "ku" | "ky" | "lo" | "lv" | "lt" | "lb" | "mk" | "mg" | "ms" | "ml" | "mt" | "mi" | "mr" | "mn" | "my" | "ne" | "no" | "ny" | "or" | "ps" | "fa" | "pl" | "pt" | "pa" | "ro" | "ru" | "sm" | "gd" | "sr" | "st" | "sn" | "sd" | "si" | "sk" | "sl" | "so" | "es" | "su" | "sw" | "sv" | "tl" | "tg" | "ta" | "tt" | "te" | "th" | "tr" | "tk" | "uk" | "ur" | "ug" | "uz" | "vi" | "cy" | "xh" | "yi" | "yo" | "zu"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `translate` command */
  export type Translate = ExtensionPreferences & {}
  /** Preferences accessible in the `translate-form` command */
  export type TranslateForm = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `translate` command */
  export type Translate = {}
  /** Arguments passed to the `translate-form` command */
  export type TranslateForm = {}
}
