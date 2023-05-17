/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Cloudflow Base URL - The domain or IP address of Cloudflow */
  "cloudflowBaseUrl": string,
  /** Packz Manual Language - The prefered language for the Packz manual */
  "packzManualLanguage": "en" | "de" | "es" | "fr" | "it" | "ja" | "zh"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `open-cloudflow-manual` command */
  export type OpenCloudflowManual = ExtensionPreferences & {}
  /** Preferences accessible in the `open-packz-manual` command */
  export type OpenPackzManual = ExtensionPreferences & {}
  /** Preferences accessible in the `open-cloudflow-workspace` command */
  export type OpenCloudflowWorkspace = ExtensionPreferences & {}
  /** Preferences accessible in the `open-cloudflow-api-docs` command */
  export type OpenCloudflowApiDocs = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `open-cloudflow-manual` command */
  export type OpenCloudflowManual = {}
  /** Arguments passed to the `open-packz-manual` command */
  export type OpenPackzManual = {}
  /** Arguments passed to the `open-cloudflow-workspace` command */
  export type OpenCloudflowWorkspace = {}
  /** Arguments passed to the `open-cloudflow-api-docs` command */
  export type OpenCloudflowApiDocs = {}
}
