import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../types/core/harmony";

/**
 * Enum for Harmony Hub state stages.
 * Represents different stages of the hub connection lifecycle.
 * @enum {string}
 */
export enum HarmonyStateStage {
  /** Initial state before any operations */
  INITIAL = "initial",
  /** Discovering hubs on the network */
  DISCOVERING = "discovering",
  /** Connecting to a selected hub */
  CONNECTING = "connecting",
  /** Loading activities from the hub */
  LOADING_ACTIVITIES = "loading_activities",
  /** Loading devices from the hub */
  LOADING_DEVICES = "loading_devices",
  /** Setup is complete */
  COMPLETE = "complete",
}

/**
 * Loading state information
 */
export interface LoadingState {
  stage: HarmonyStateStage;
  progress: number;
  message: string;
}

/**
 * Core state for Harmony operations
 */
export interface HarmonyState {
  hubs: HarmonyHub[];
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
  currentActivity: HarmonyActivity | null;
  selectedHub: HarmonyHub | null;
  error: Error | null;
}

/**
 * Initial loading state
 */
export const initialLoadingState: LoadingState = {
  stage: HarmonyStateStage.DISCOVERING,
  progress: 0,
  message: "Initializing...",
};

/**
 * Initial harmony state
 */
export const initialHarmonyState: HarmonyState = {
  hubs: [],
  devices: [],
  activities: [],
  currentActivity: null,
  selectedHub: null,
  error: null,
};
