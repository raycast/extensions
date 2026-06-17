/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Application ID - The AppId value seen in the Developer section of a Starline account. */
  "AppId": string,
  /** Secret - The Secret value seen in the Developer section of a Starline account. */
  "Secret": string,
  /** Login - Your Starline login. */
  "Login": string,
  /** Password - Your Starline password. */
  "Password": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `devices` command */
  export type Devices = ExtensionPreferences & {}
  /** Preferences accessible in the `arm` command */
  export type Arm = ExtensionPreferences & {}
  /** Preferences accessible in the `disarm` command */
  export type Disarm = ExtensionPreferences & {}
  /** Preferences accessible in the `start_engine` command */
  export type StartEngine = ExtensionPreferences & {}
  /** Preferences accessible in the `stop_engine` command */
  export type StopEngine = ExtensionPreferences & {}
  /** Preferences accessible in the `arm_quietly` command */
  export type ArmQuietly = ExtensionPreferences & {}
  /** Preferences accessible in the `disarm_quietly` command */
  export type DisarmQuietly = ExtensionPreferences & {}
  /** Preferences accessible in the `horn` command */
  export type Horn = ExtensionPreferences & {}
  /** Preferences accessible in the `update_position` command */
  export type UpdatePosition = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `devices` command */
  export type Devices = {}
  /** Arguments passed to the `arm` command */
  export type Arm = {}
  /** Arguments passed to the `disarm` command */
  export type Disarm = {}
  /** Arguments passed to the `start_engine` command */
  export type StartEngine = {}
  /** Arguments passed to the `stop_engine` command */
  export type StopEngine = {}
  /** Arguments passed to the `arm_quietly` command */
  export type ArmQuietly = {}
  /** Arguments passed to the `disarm_quietly` command */
  export type DisarmQuietly = {}
  /** Arguments passed to the `horn` command */
  export type Horn = {}
  /** Arguments passed to the `update_position` command */
  export type UpdatePosition = {}
}

