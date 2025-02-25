/**
 * View-related type definitions
 * @module
 */

import type { Draft } from "immer";

import type { HarmonyDevice, HarmonyActivity } from "./harmony";

/**
 * Available views in the application
 */
export enum View {
  HUBS = "hubs",
  DEVICES = "devices",
  ACTIVITIES = "activities",
  DEVICE_DETAIL = "device_detail",
  ACTIVITY_DETAIL = "activity_detail",
}

/**
 * View state for the application
 */
export interface ViewState {
  /** Current active view */
  readonly currentView: View;
  /** Selected device for detail view */
  readonly selectedDevice: HarmonyDevice | null;
  /** Selected activity for detail view */
  readonly selectedActivity: HarmonyActivity | null;
  /** Search query for current view */
  readonly searchQuery: string;
  /** Filter settings */
  readonly filters: ViewFilters;
}

/**
 * Mutable view state for Immer
 */
export interface MutableViewState {
  /** Current active view */
  currentView: View;
  /** Selected device for detail view */
  selectedDevice: Draft<HarmonyDevice> | null;
  /** Selected activity for detail view */
  selectedActivity: Draft<HarmonyActivity> | null;
  /** Search query for current view */
  searchQuery: string;
  /** Filter settings */
  filters: MutableViewFilters;
}

/**
 * Filter settings for views
 */
export interface ViewFilters {
  /** Device type filter */
  readonly deviceType?: string;
  /** Activity type filter */
  readonly activityType?: string;
  /** Show only favorite items */
  readonly showFavorites: boolean;
}

/**
 * Mutable filter settings for Immer
 */
export interface MutableViewFilters {
  /** Device type filter */
  deviceType?: string;
  /** Activity type filter */
  activityType?: string;
  /** Show only favorite items */
  showFavorites: boolean;
}

/**
 * View transition events
 */
export type ViewEvent =
  | { type: "VIEW_CHANGE"; view: View }
  | { type: "SELECT_DEVICE"; device: HarmonyDevice }
  | { type: "SELECT_ACTIVITY"; activity: HarmonyActivity }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_FILTERS"; filters: Partial<ViewFilters> };

/**
 * View action handlers
 */
export interface ViewActions {
  /** Change the current view */
  changeView: (view: View) => void;
  /** Select a device for detail view */
  selectDevice: (device: HarmonyDevice) => void;
  /** Select an activity for detail view */
  selectActivity: (activity: HarmonyActivity) => void;
  /** Clear current selection */
  clearSelection: () => void;
  /** Update search query */
  setSearch: (query: string) => void;
  /** Update filter settings */
  setFilters: (filters: Partial<ViewFilters>) => void;
}
