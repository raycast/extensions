/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Path to Vault - Specify the path or multiple paths (comma separated) to your vault/vaults. Leave empty to auto-detect from Obsidian. */
  "vaultPath"?: string,
  /** Multi-Vault Behavior - Go directly to your active vault instead of showing vault picker. Use Cmd+Shift+V to switch vaults. */
  "useActiveVaultAsDefault": boolean,
  /** Excluded Folders - Folders to exclude from search results (comma separated) */
  "excludedFolders"?: string,
  /** undefined - Display vault name/badge in search results when using multiple vaults */
  "showVaultIndicatorsInResults": boolean,
  /** Vault Indicator Style - How to display vault indicators in results */
  "vaultIndicatorStyle": "badge" | "subtitle" | "both",
  /** undefined - Search all vaults at once in Recent Notes command */
  "crossVaultSearchEnabled": boolean,
  /** Content Display - Hide YAML frontmatter when viewing and copying notes */
  "removeYAML"?: boolean,
  /** undefined - Hide LaTeX (surrounded by $$ or $) when viewing and copying notes */
  "removeLatex"?: boolean,
  /** undefined - Hide [[wikilinks]] when viewing and copying notes */
  "removeLinks"?: boolean,
  /** Advanced - Override vault config folder name (default: .obsidian). Only change if using custom config. */
  "configFileName": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `searchNoteCommand` command */
  export type SearchNoteCommand = ExtensionPreferences & {
  /** Template for Append action - Specify a template for Append action (e.g. '- {content}') */
  "appendTemplate"?: string,
  /** Template for Append Selected Text action - Specify a template for Append Selected Text action (e.g. '- {content}') */
  "appendSelectedTemplate"?: string,
  /** Show Detail - Show the notes content in a detail view */
  "showDetail": boolean,
  /** Show Metadata - Show the notes metadata in a detail view (only works when Show Detail is enabled) */
  "showMetadata": boolean,
  /** Search Content - Use the content of notes for searching */
  "searchContent": boolean,
  /** Use Fuzzy Search - If fuzzy search should be used */
  "fuzzySearch": boolean,
  /** Primary Action - Select a primary action to be executed on enter */
  "primaryAction"?: "quicklook" | "obsidian" | "newpane" | "defaultapp"
}
  /** Preferences accessible in the `starredNotesCommand` command */
  export type StarredNotesCommand = ExtensionPreferences & {
  /** Template for Append action - Specify a template for Append action (e.g. '- {content}') */
  "appendTemplate"?: string,
  /** Template for Append Selected Text action - Specify a template for Append Selected Text action (e.g. '- {content}') */
  "appendSelectedTemplate"?: string,
  /** Show Detail - Show the notes content in a detail view */
  "showDetail": boolean,
  /** Show Metadata - Show the notes metadata in a detail view (only works when Show Detail is enabled) */
  "showMetadata": boolean,
  /** Search Content - Use the content of notes for searching */
  "searchContent": boolean,
  /** Primary Action - Select a primary action to be executed on enter */
  "primaryAction"?: "quicklook" | "obsidian" | "newpane" | "defaultapp"
}
  /** Preferences accessible in the `openVaultCommand` command */
  export type OpenVaultCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `dailyNoteAppendCommand` command */
  export type DailyNoteAppendCommand = ExtensionPreferences & {
  /** Template for Daily Note Append action - Specify a template for Daily Note Append action (e.g. '- {content}') */
  "appendTemplate"?: string,
  /** Name of Obsidian vault where note is - Name of Obsidian vault where note is */
  "vaultName"?: string,
  /** Name of heading in note in which to append - If no heading is set, text will be appended to the end of the daily note */
  "heading"?: string,
  /** Prepend - Prepend the text instead of appending */
  "prepend": boolean,
  /** Silent Mode - Don't open daily note when appending to the daily note. */
  "silent": boolean
}
  /** Preferences accessible in the `dailyNoteCommand` command */
  export type DailyNoteCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `createNoteCommand` command */
  export type CreateNoteCommand = ExtensionPreferences & {
  /** Blank Note - Create a blank note */
  "blankNote": boolean,
  /** Open Note on Creation - Open the created note in Obsidian */
  "openOnCreate": boolean,
  /** Default Path - The default path where a new note will be created */
  "prefPath": string,
  /** Default Note Name - The default note name if no name is specified */
  "prefNoteName": string,
  /** Default Note Content - The default note content (supports templates) */
  "prefNoteContent": string,
  /** Fill form with defaults - Fill form with default values */
  "fillFormWithDefaults": boolean,
  /** Default Tag - The default selected tag */
  "prefTag": string,
  /** Tags - The tags which will be suggested on note creation */
  "tags": string,
  /** Folder Actions - Add actions to folders (comma separated) */
  "folderActions": string
}
  /** Preferences accessible in the `randomNoteCommand` command */
  export type RandomNoteCommand = ExtensionPreferences & {
  /** Template for Append action - Specify a template for Append action (e.g. '- {content}') */
  "appendTemplate"?: string,
  /** Template for Append Selected Text action - Specify a template for Append Selected Text action (e.g. '- {content}') */
  "appendSelectedTemplate"?: string,
  /** Primary Action - Select a primary action to be executed on enter */
  "primaryAction"?: "quicklook" | "obsidian" | "newpane" | "defaultapp"
}
  /** Preferences accessible in the `searchMedia` command */
  export type SearchMedia = ExtensionPreferences & {
  /** Exclude following folders - Specify which folders to exclude (comma separated) */
  "excludedFolders"?: string,
  /** Image Size - Select the image size to display */
  "imageSize"?: "small" | "medium" | "large"
}
  /** Preferences accessible in the `obsidianMenuBar` command */
  export type ObsidianMenuBar = ExtensionPreferences & {}
  /** Preferences accessible in the `appendTaskCommand` command */
  export type AppendTaskCommand = ExtensionPreferences & {
  /** Path of the note you wish to append the task to - Path of note */
  "notePath": string,
  /** Tag to append to the beginning of the task. - Defaults to #task for compatibility with Obsidian Tasks. */
  "noteTag": string,
  /** Creation Date - ➕ YYYY-MM-DD (Current date) */
  "creationDate": boolean,
  /** Name of Obsidian vault where note is - Name of Obsidian vault where note is */
  "vaultName"?: string,
  /** Name of heading in note in which to append - If no heading is not set, text will be appended to the end of the note */
  "heading"?: string,
  /** Silent Mode - Don't open note when appending. */
  "silent": boolean
}
  /** Preferences accessible in the `manageVaultsCommand` command */
  export type ManageVaultsCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `vaultSwitcherCommand` command */
  export type VaultSwitcherCommand = ExtensionPreferences & {}
  /** Preferences accessible in the `recentNotesCommand` command */
  export type RecentNotesCommand = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `searchNoteCommand` command */
  export type SearchNoteCommand = {
  /** Note */
  "searchArgument": string,
  /** Tag */
  "tagArgument": string
}
  /** Arguments passed to the `starredNotesCommand` command */
  export type StarredNotesCommand = {
  /** Note */
  "searchArgument": string,
  /** Tag */
  "tagArgument": string
}
  /** Arguments passed to the `openVaultCommand` command */
  export type OpenVaultCommand = {}
  /** Arguments passed to the `dailyNoteAppendCommand` command */
  export type DailyNoteAppendCommand = {
  /** Take out the trash */
  "text": string
}
  /** Arguments passed to the `dailyNoteCommand` command */
  export type DailyNoteCommand = {}
  /** Arguments passed to the `createNoteCommand` command */
  export type CreateNoteCommand = {}
  /** Arguments passed to the `randomNoteCommand` command */
  export type RandomNoteCommand = {}
  /** Arguments passed to the `searchMedia` command */
  export type SearchMedia = {
  /** Name */
  "searchArgument": string,
  /** Type */
  "typeArgument": string
}
  /** Arguments passed to the `obsidianMenuBar` command */
  export type ObsidianMenuBar = {}
  /** Arguments passed to the `appendTaskCommand` command */
  export type AppendTaskCommand = {
  /** Your task */
  "text": string,
  /** YYYY-MM-DD */
  "dueDate": string
}
  /** Arguments passed to the `manageVaultsCommand` command */
  export type ManageVaultsCommand = {}
  /** Arguments passed to the `vaultSwitcherCommand` command */
  export type VaultSwitcherCommand = {}
  /** Arguments passed to the `recentNotesCommand` command */
  export type RecentNotesCommand = {}
}

