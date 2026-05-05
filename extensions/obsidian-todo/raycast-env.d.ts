/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Obsidian Vault Folder - The root folder of your Obsidian vault. */
  "vaultPath": string,
  /** ToDo Note Path - Path to your todo note inside the vault. Relative paths are resolved from the vault root. */
  "todoNotePath": string,
  /** Missing Note - Automatically create the todo note if it does not exist yet. */
  "createNoteIfMissing": boolean,
  /** New Todo Placement - Choose where new todos should be inserted in the note. */
  "newTodoPlacement": "append" | "prepend"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `manage-obsidian-todos` command */
  export type ManageObsidianTodos = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `manage-obsidian-todos` command */
  export type ManageObsidianTodos = {}
}

