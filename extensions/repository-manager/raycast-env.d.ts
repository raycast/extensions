/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Projects Path - The path to the folder containing your projects */
  "projectsPath": string,
  /** Primary Action - The primary action to perform when pressing Enter on a project */
  "primaryAction": "open-in-editor" | "open-in-terminal" | "start-development" | "open-url" | "open-git-remotes",
  /** Max Scanning Levels (folder recursion) - The max number of levels to scan for projects */
  "maxScanningLevels": string,
  /** undefined - Enable caching of projects to avoid scanning directories every time (you can clear it by using the "Clear Cache" command) */
  "enableProjectsCaching": boolean,
  /** undefined - Group projects by folder */
  "enableProjectsGrouping": boolean,
  /** undefined - Show the top Recently Opened section in the repository list. The Recently Opened filter and item indicators remain available when this is disabled. */
  "showRecentlyOpenedInList": boolean,
  /** undefined - Display Git status, ahead/behind, upstream, and recent-open indicators in the repository list. Filters still work when this is disabled. */
  "showGitInfoInList": boolean,
  /** Editor App - The editor app to use */
  "editorApp"?: import("@raycast/api").Application,
  /** Terminal App - The terminal app to use */
  "terminalApp"?: import("@raycast/api").Application,
  /** Browser App - The browser app to use */
  "browserApp"?: import("@raycast/api").Application,
  /** Local Project URL Template - The template for the URL of your projects (use {project} as placeholder for the project name, additionally you can use any placeholder defined in the project config file) */
  "localProjectUrlTemplate": string,
  /** undefined - Resize the editor window after launching a project */
  "resizeEditorWindowAfterLaunch"?: boolean,
  /** Resize Mode - The mode to use when resizing the editor window */
  "windowResizeMode": "reasonable-size" | "almost-maximize" | "toggle-fullscreen" | "maximize" | "left-half" | "center-half" | "right-half" | "top-half" | "bottom-half" | "previous-display" | "next-display" | "previous-desktop" | "next-desktop"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `list` command */
  export type List = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list` command */
  export type List = {}
}

