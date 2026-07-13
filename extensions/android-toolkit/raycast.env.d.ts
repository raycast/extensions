/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's package.json.
 * Do not edit intentionally.
 * 🚧 🚧 🚧 */

declare namespace Preferences {
  /** Preferences accessible in all the extension's commands */
  interface ExtensionPreferences {
    /** ADB Executable Path - Path to the ADB executable (e.g. /usr/local/bin/adb, or leave empty if in PATH) */
    adbPath?: string;
    /** Show System Profiles - Show system-created profiles like Dual App, Secure Folder, etc. */
    showSystemProfiles?: boolean;
  }
}

declare namespace Arguments {
  /** Arguments passed to the `manage-users` command */
  export type ManageUsers = {};
  /** Arguments passed to the `install-apk` command */
  export type InstallApk = {};
  /** Arguments passed to the `take-screenshot` command */
  export type TakeScreenshot = {};
  /** Arguments passed to the `manage-devices` command */
  export type ManageDevices = {};
}
