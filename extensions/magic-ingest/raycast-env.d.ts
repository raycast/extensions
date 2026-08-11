/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `ingest` command */
  export type Ingest = ExtensionPreferences & {}
  /** Preferences accessible in the `ingest-status` command */
  export type IngestStatus = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `ingest` command */
  export type Ingest = {}
  /** Arguments passed to the `ingest-status` command */
  export type IngestStatus = {}
}

