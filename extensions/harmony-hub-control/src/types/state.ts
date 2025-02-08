import { HarmonyError } from "./errors";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "./harmony";

/**
 * State machine states for Harmony Hub control
 * @enum {string}
 */
export enum MachineState {
  /** Initial state */
  IDLE = "IDLE",
  /** Discovering available hubs */
  DISCOVERING = "DISCOVERING",
  /** Connecting to a hub */
  CONNECTING = "CONNECTING",
  /** Connected to a hub */
  CONNECTED = "CONNECTED",
  /** Error state */
  ERROR = "ERROR",
}

/**
 * Context data for Harmony state machine
 * @interface MachineContext
 */
export interface MachineContext {
  /** List of available hubs */
  hubs: HarmonyHub[];
  /** Currently selected hub */
  selectedHub: HarmonyHub | null;
  /** Available devices on the hub */
  devices: HarmonyDevice[];
  /** Available activities on the hub */
  activities: HarmonyActivity[];
  /** Currently running activity */
  currentActivity: HarmonyActivity | null;
  /** Error state if any */
  error: HarmonyError | null;
}

/**
 * Event payload for hub discovery
 * @interface DiscoverEvent
 */
export interface DiscoverEvent {
  type: "DISCOVER";
}

/**
 * Event payload for hub selection
 * @interface SelectHubEvent
 */
export interface SelectHubEvent {
  type: "SELECT_HUB";
  /** Hub to select */
  hub: HarmonyHub;
}

/**
 * Event payload for state refresh
 * @interface RefreshEvent
 */
export interface RefreshEvent {
  type: "REFRESH";
}

/**
 * Event payload for retrying a failed action
 * @interface RetryEvent
 */
export interface RetryEvent {
  type: "RETRY";
}

/**
 * Event payload for clearing the state
 * @interface ClearEvent
 */
export interface ClearEvent {
  type: "CLEAR";
}

/**
 * Event payload for hub disconnection
 * @interface DisconnectEvent
 */
export interface DisconnectEvent {
  type: "DISCONNECT";
}

/**
 * Event payload for error state
 * @interface ErrorEvent
 */
export interface ErrorEvent {
  type: "error.platform";
  /** Error that occurred */
  data: HarmonyError;
}

/**
 * Event payload for done discovering hubs
 * @interface DoneDiscoverEvent
 */
export interface DoneDiscoverEvent {
  type: "done.invoke.discoverHubs";
  /** List of discovered hubs */
  data: {
    hubs: HarmonyHub[];
  };
}

/**
 * Event payload for done loading hub data
 * @interface DoneLoadHubEvent
 */
export interface DoneLoadHubEvent {
  type: "done.invoke.loadHubData";
  /** Loaded hub data */
  data: {
    devices: HarmonyDevice[];
    activities: HarmonyActivity[];
  };
}

/**
 * Union type of all possible state machine events
 * @type {MachineEvent}
 */
export type MachineEvent =
  | DiscoverEvent
  | SelectHubEvent
  | DisconnectEvent
  | RefreshEvent
  | RetryEvent
  | ClearEvent
  | ErrorEvent
  | DoneDiscoverEvent
  | DoneLoadHubEvent;

/**
 * Service types for XState
 * @interface MachineServices
 */
export interface MachineServices {
  discoverHubs: {
    data: { hubs: HarmonyHub[] };
  };
  loadHubData: {
    data: { devices: HarmonyDevice[]; activities: HarmonyActivity[] };
  };
}
