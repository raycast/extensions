/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

interface CommandPreferences {
  "send-to-photo-mechanic": {
    /** Seconds to wait after triggering Show in Finder before reading the file path. Increase if your catalog is on a slow network drive. */
    "delay": string
  }
}

declare namespace Preferences {
  /** Preferences accessible in the `send-to-photo-mechanic` command */
  export interface SendToPhotoMechanic {
    /** Seconds to wait after triggering Show in Finder before reading the file path. Increase if your catalog is on a slow network drive. */
    "delay": string
  }
}
