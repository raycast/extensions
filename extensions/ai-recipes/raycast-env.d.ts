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
  /** Preferences accessible in the `recipes` command */
  export type Recipes = ExtensionPreferences & {}
  /** Preferences accessible in the `create-recipe` command */
  export type CreateRecipe = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-tags` command */
  export type ManageTags = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `recipes` command */
  export type Recipes = {}
  /** Arguments passed to the `create-recipe` command */
  export type CreateRecipe = {}
  /** Arguments passed to the `manage-tags` command */
  export type ManageTags = {}
}

