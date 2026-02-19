/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Workspace 1 Name - Display name for workspace 1 (optional, defaults to 'Default') */
  "workspace1Name"?: string,
  /** Workspace 1 API Key - API key for workspace 1 (required) */
  "workspace1ApiKey": string,
  /** Workspace 2 Name - Display name for workspace 2 (optional) */
  "workspace2Name"?: string,
  /** Workspace 2 API Key - API key for workspace 2 (optional) */
  "workspace2ApiKey"?: string,
  /** Workspace 3 Name - Display name for workspace 3 (optional) */
  "workspace3Name"?: string,
  /** Workspace 3 API Key - API key for workspace 3 (optional) */
  "workspace3ApiKey"?: string,
  /** Default Workspace - Name of the default workspace to use (must match one of the workspace names above) */
  "defaultWorkspace"?: string,
  /** Date Format - How to display meeting dates */
  "dateFormat": "relative" | "absolute",
  /** Page Size - Number of meetings to load per page */
  "pageSize": "25" | "50" | "100",
  /** Cache Duration - How long to cache meeting data */
  "cacheTTL": "5" | "15" | "30" | "60",
  /** Menu Bar - Display recent meetings icon in the macOS menu bar */
  "showMenuBar": boolean,
  /** Development - Use sample mock data instead of real API calls. Useful for development and testing. */
  "useMockData": boolean
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `list-meetings` command */
  export type ListMeetings = ExtensionPreferences & {}
  /** Preferences accessible in the `search-meetings` command */
  export type SearchMeetings = ExtensionPreferences & {}
  /** Preferences accessible in the `recent-meetings` command */
  export type RecentMeetings = ExtensionPreferences & {}
  /** Preferences accessible in the `open-meeting` command */
  export type OpenMeeting = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `list-meetings` command */
  export type ListMeetings = {}
  /** Arguments passed to the `search-meetings` command */
  export type SearchMeetings = {}
  /** Arguments passed to the `recent-meetings` command */
  export type RecentMeetings = {}
  /** Arguments passed to the `open-meeting` command */
  export type OpenMeeting = {
  /** Meeting ID */
  "meetingId": string,
  /** Meeting URL */
  "meetingUrl": string
}
}

