/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Paired Extension Owner - Raycast owner or author of the paired extension. Use prmptd for the private organization copy. */
  "pairedExtensionOwner": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `create-ground-packet` command */
  export type CreateGroundPacket = ExtensionPreferences & {}
  /** Preferences accessible in the `browse-ground-packets` command */
  export type BrowseGroundPackets = ExtensionPreferences & {}
  /** Preferences accessible in the `receive-handoff` command */
  export type ReceiveHandoff = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `create-ground-packet` command */
  export type CreateGroundPacket = {}
  /** Arguments passed to the `browse-ground-packets` command */
  export type BrowseGroundPackets = {}
  /** Arguments passed to the `receive-handoff` command */
  export type ReceiveHandoff = {}
}

