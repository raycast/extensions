/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Catalog URL - JSON catalog endpoint. Defaults to the live orc.pictures catalog. */
  "catalogUrl": string,
  /** Site URL - Used to resolve GIF and poster paths. */
  "siteUrl": string,
  /** Local GIFs Folder - Optional. Point this at public/gifs in the orc.pictures repo to copy files without downloading. */
  "localGifsDirectory"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `search-gifs` command */
  export type SearchGifs = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `search-gifs` command */
  export type SearchGifs = {}
}

