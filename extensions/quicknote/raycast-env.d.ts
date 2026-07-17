/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Storage - Choose where QuickNote writes notes. */
  "storageMode": "local" | "ssh",
  /** File Mode - Use a new file each day or one fixed file. */
  "fileMode": "daily" | "static",
  /** Static Filename - Used in Static mode, e.g. inbox.md */
  "staticFilename"?: string,
  /** Local Notes Folder - Used when Storage is Local, e.g. ~/Notes */
  "localFolder"?: string,
  /** Remote Shell - Choose the shell used by the SSH host. */
  "remoteShell": "posix" | "powershell",
  /** SSH Target - Used when Storage is SSH, e.g. user@host or an SSH config alias */
  "sshTarget"?: string,
  /** Remote Notes Folder - Used when Storage is SSH; path on the remote host */
  "remoteFolder"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `quicknote` command */
  export type Quicknote = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `quicknote` command */
  export type Quicknote = {
  /** Note */
  "note": string
}
}

