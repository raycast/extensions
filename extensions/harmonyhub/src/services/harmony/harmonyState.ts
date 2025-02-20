import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../types/core/harmony";

/**
 * State machine stages for Harmony operations
 */
export enum HarmonyStage {
  DISCOVERING = "discovering",
  CONNECTING = "connecting",
  LOADING_ACTIVITIES = "loading-activities",
  LOADING_DEVICES = "loading-devices",
  COMPLETE = "complete",
}

/**
 * Loading state information
 */
export interface LoadingState {
  stage: HarmonyStage;
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
  stage: HarmonyStage.DISCOVERING,
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
