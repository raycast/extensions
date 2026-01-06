/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Username/Email - Your username or email used to log in at languagetool.org (for Premium access). */
  "username"?: string,
  /** API Key - Your API key from https://languagetool.org/editor/settings/access-tokens (for Premium access). */
  "apiKey"?: string,
  /** undefined - Display advanced option fields in the form. Values below are always used when filled, regardless of this setting. */
  "showAdvancedOptions": boolean,
  /** Mother Tongue - Your native language code (e.g., pt-BR, es) for false friends detection. */
  "motherTongue"?: string,
  /** Preferred Variants - Comma-separated list of preferred language variants when using auto-detection (e.g., en-GB,de-AT). */
  "preferredVariants"?: string,
  /** Check Level - Verification level: empty (default API behavior), 'default' (force standard mode), or 'picky' (stricter checking with additional rules for formal text). */
  "level": "" | "default" | "picky",
  /** Enabled Rules - Comma-separated list of rule IDs to enable (e.g., RULE_ID_1,RULE_ID_2). */
  "enabledRules"?: string,
  /** Disabled Rules - Comma-separated list of rule IDs to disable (e.g., WHITESPACE_RULE). */
  "disabledRules"?: string,
  /** Enabled Categories - Comma-separated list of category IDs to enable (e.g., GRAMMAR,TYPOS). */
  "enabledCategories"?: string,
  /** Disabled Categories - Comma-separated list of category IDs to disable (e.g., STYLE). */
  "disabledCategories"?: string,
  /** undefined - If checked, only rules/categories specified in 'Enabled Rules' or 'Enabled Categories' will be active. */
  "enabledOnly": boolean,
  /** undefined - If checked, enables hidden rules in the API. */
  "enableHiddenRules": boolean,
  /** Noop Languages - Comma-separated list of language codes that should not be processed (e.g., pt,en). */
  "noopLanguages": string,
  /** A/B Test - A/B test configuration string for experimental features. To get the best A/B test combination, use the official website https://languagetool.org/ and check the POST request to /check in devtools. */
  "abtest": string,
  /** Mode - API mode: empty (default), 'allButTextLevelOnly', or 'textLevelOnly'. */
  "mode": "" | "allButTextLevelOnly" | "textLevelOnly",
  /** undefined - If checked, allows the API to return incomplete results. */
  "allowIncompleteResults": boolean,
  /** User Agent - User agent configuration for API requests. */
  "useragent": "standalone" | ""
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `check-text` command */
  export type CheckText = ExtensionPreferences & {}
  /** Preferences accessible in the `check-text-instant` command */
  export type CheckTextInstant = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `check-text` command */
  export type CheckText = {}
  /** Arguments passed to the `check-text-instant` command */
  export type CheckTextInstant = {}
}

