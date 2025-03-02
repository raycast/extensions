/**
 * Core state type definitions for Harmony Hub integration
 * @module
 */

import { HarmonyHub, HarmonyDevice, HarmonyActivity, LoadingState } from "./harmony";

/**
 * Represents the stage of the Harmony Hub connection process
 * @enum {string}
 */
export enum HarmonyStage {
  /** Initial state before any connection attempt */
  INITIAL = "initial",
  /** Actively discovering hubs on the network */
  DISCOVERING = "discovering",
  /** Establishing connection to a specific hub */
  CONNECTING = "connecting",
  /** Loading device information from the hub */
  LOADING_DEVICES = "loading_devices",
  /** Loading activity information from the hub */
  LOADING_ACTIVITIES = "loading_activities",
  /** Starting a new activity */
  STARTING_ACTIVITY = "starting_activity",
  /** Stopping the current activity */
  STOPPING_ACTIVITY = "stopping_activity",
  /** Executing a device command */
  EXECUTING_COMMAND = "executing_command",
  /** Refreshing hub state */
  REFRESHING = "refreshing",
  /** Successfully connected and ready */
  CONNECTED = "connected",
  /** Error state */
  ERROR = "error",
}

/**
 * Represents the loading state during operations
 * @interface HarmonyLoadingState
 */
export interface HarmonyLoadingState {
  /** Current stage of the process */
  readonly stage: HarmonyStage;
  /** Progress from 0 to 1 */
  readonly progress: number;
  /** User-friendly message about the current state */
  readonly message: string;
}

/**
 * Current state of the Harmony Hub system
 * @interface HarmonyState
 */
export interface HarmonyState {
  /** Available Harmony Hubs */
  readonly hubs: readonly HarmonyHub[];
  /** Currently selected hub */
  readonly selectedHub: HarmonyHub | null;
  /** Available devices */
  readonly devices: readonly HarmonyDevice[];
  /** Available activities */
  readonly activities: readonly HarmonyActivity[];
  /** Currently running activity */
  readonly currentActivity: HarmonyActivity | null;
  /** Current error if any */
  readonly error: Error | null;
  /** Current loading state */
  readonly loadingState: LoadingState;
  /** Active client for hub communication */
  readonly client: unknown | null;
}
