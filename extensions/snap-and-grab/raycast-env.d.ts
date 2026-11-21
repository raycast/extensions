/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Screenshot Folder - Leave empty to use your macOS screenshot location. */
  "screenshotFolder"?: string,
  /** Copy Confirmation - How long the copied confirmation stays visible. Clipboard transfer is completed even when confirmation is off. */
  "confirmation": "0" | "1.5" | "3",
  /** Thumbnail Previews - Show screenshot previews in the selection and confirmation HUD. */
  "showPreviews": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `capture` command */
  export type Capture = ExtensionPreferences & {}
  /** Preferences accessible in the `select-recent` command */
  export type SelectRecent = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `capture` command */
  export type Capture = {}
  /** Arguments passed to the `select-recent` command */
  export type SelectRecent = {}
}

declare module "swift:*/swift" {
  export function launchCapture(folder: string, supportPath: string, previews: boolean, confirmationDuration: number): Promise<void>;
  export function captureSession(folder: string, supportPath: string, previews: boolean, confirmationDuration: number, initialFlags: number, requestedAt: number): Promise<void>;
  export function listScreenshots(folder: string, limit: number): Promise<any>;
  export function copyFiles(paths: string[], supportPath: string, confirmationDuration: number, previews: boolean): Promise<void>;
  export function clipboardSession(paths: string[], confirmationDuration: number, previews: boolean): Promise<void>;

  export class SwiftError extends Error {
    stderr: string;
    stdout: string;
  }
}