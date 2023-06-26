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
  /** Preferences accessible in the `devices` command */
  export type Devices = ExtensionPreferences & {}
  /** Preferences accessible in the `my-devices` command */
  export type MyDevices = ExtensionPreferences & {}
  /** Preferences accessible in the `account-switcher` command */
  export type AccountSwitcher = ExtensionPreferences & {}
  /** Preferences accessible in the `exit` command */
  export type Exit = ExtensionPreferences & {}
  /** Preferences accessible in the `admin` command */
  export type Admin = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `devices` command */
  export type Devices = {}
  /** Arguments passed to the `my-devices` command */
  export type MyDevices = {}
  /** Arguments passed to the `account-switcher` command */
  export type AccountSwitcher = {}
  /** Arguments passed to the `exit` command */
  export type Exit = {}
  /** Arguments passed to the `admin` command */
  export type Admin = {}
}
