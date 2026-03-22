/// <reference types="@vicinae/api">

/*
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 */

type ExtensionPreferences = {
  /** API Key - Your Keeply API key. Generate one at app.keeply.tools/settings → Developer */
	"apiKey"?: string;
}

declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Command: Search Bookmarks */
	export type SearchBookmarks = ExtensionPreferences & {
		
	}

	/** Command: Add Bookmark */
	export type AddBookmark = ExtensionPreferences & {
		
	}
}

declare namespace Arguments {
  /** Command: Search Bookmarks */
	export type SearchBookmarks = {
		
	}

	/** Command: Add Bookmark */
	export type AddBookmark = {
		
	}
}