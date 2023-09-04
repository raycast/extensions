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
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `choose_terminal_app` command */
  export type ChooseTerminalApp = ExtensionPreferences & {}
  /** Preferences accessible in the `create_new_session` command */
  export type CreateNewSession = ExtensionPreferences & {}
  /** Preferences accessible in the `manage_tmux_windows` command */
  export type ManageTmuxWindows = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `choose_terminal_app` command */
  export type ChooseTerminalApp = {}
  /** Arguments passed to the `create_new_session` command */
  export type CreateNewSession = {}
  /** Arguments passed to the `manage_tmux_windows` command */
  export type ManageTmuxWindows = {}
}


declare module "swift:*" {
  function run<T = unknown, U = any>(command: string, input?: U): Promise<T>;
  export default run;
	export class SwiftError extends Error {
    stderr: string;
    stdout: string;
  }
}
