/**
 * State machine for managing Harmony Hub states and transitions.
 * @module
 */

import { assign, createMachine } from "xstate";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../types/harmony";
import { Logger } from "../logger";
import { ErrorCategory } from "../../types/errors";

/**
 * Possible states for the Harmony Hub state machine.
 */
export enum HarmonyState {
  /** Initial state */
  IDLE = "idle",
  /** Discovering hubs */
  DISCOVERING = "discovering",
  /** Connecting to hub */
  CONNECTING = "connecting",
  /** Connected and ready */
  CONNECTED = "connected",
  /** Executing command */
  EXECUTING = "executing",
  /** Error state */
  ERROR = "error",
}

/**
 * Events that can trigger state transitions.
 */
export enum HarmonyEvent {
  /** Start hub discovery */
  START_DISCOVERY = "START_DISCOVERY",
  /** Hub discovered */
  HUB_DISCOVERED = "HUB_DISCOVERED",
  /** Start connection */
  START_CONNECTION = "START_CONNECTION",
  /** Connection established */
  CONNECTION_ESTABLISHED = "CONNECTION_ESTABLISHED",
  /** Start command execution */
  START_EXECUTION = "START_EXECUTION",
  /** Command completed */
  EXECUTION_COMPLETE = "EXECUTION_COMPLETE",
  /** Error occurred */
  ERROR = "ERROR",
  /** Reset state */
  RESET = "RESET"
}

/**
 * Context for the state machine.
 */
interface HarmonyContext {
  hub?: HarmonyHub;
  device?: HarmonyDevice;
  error?: Error;
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
}

type HarmonyEvents =
  | { type: HarmonyEvent.START_DISCOVERY }
  | { type: HarmonyEvent.START_CONNECTION; hub: HarmonyHub }
  | { type: HarmonyEvent.HUB_DISCOVERED; hub: HarmonyHub }
  | { type: HarmonyEvent.CONNECTION_ESTABLISHED }
  | { type: HarmonyEvent.START_EXECUTION }
  | { type: HarmonyEvent.EXECUTION_COMPLETE }
  | { type: HarmonyEvent.ERROR; error: Error }
  | { type: HarmonyEvent.RESET };

/**
 * State machine for managing Harmony Hub operations.
 * Implements a finite state machine pattern for handling hub states and transitions.
 */
export const harmonyMachine = createMachine({
  id: "harmony",
  initial: "idle",
  types: {} as {
    context: HarmonyContext;
    events: HarmonyEvents;
  },
  context: {
    hubs: [],
    selectedHub: null,
    devices: [],
    activities: []
  },
  states: {
    idle: {
      on: {
        [HarmonyEvent.START_DISCOVERY]: "discovering",
        [HarmonyEvent.START_CONNECTION]: {
          target: "connecting",
          actions: [
            assign({
              selectedHub: ({ event }) => {
                if (event.type === HarmonyEvent.START_CONNECTION) {
                  return event.hub;
                }
                return null;
              }
            })
          ]
        }
      }
    },
    discovering: {
      on: {
        [HarmonyEvent.HUB_DISCOVERED]: {
          actions: [
            assign({
              hubs: ({ context, event }) => {
                if (event.type === HarmonyEvent.HUB_DISCOVERED) {
                  return [...context.hubs, event.hub];
                }
                return context.hubs;
              }
            })
          ]
        },
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: [
            assign({
              error: ({ event }) => {
                if (event.type === HarmonyEvent.ERROR) {
                  return event.error;
                }
                return undefined;
              }
            })
          ]
        }
      }
    },
    connecting: {
      on: {
        [HarmonyEvent.CONNECTION_ESTABLISHED]: "connected",
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: [
            assign({
              error: ({ event }) => {
                if (event.type === HarmonyEvent.ERROR) {
                  return event.error;
                }
                return undefined;
              }
            })
          ]
        }
      }
    },
    connected: {
      on: {
        [HarmonyEvent.START_EXECUTION]: "executing",
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: [
            assign({
              error: ({ event }) => {
                if (event.type === HarmonyEvent.ERROR) {
                  return event.error;
                }
                return undefined;
              }
            })
          ]
        }
      }
    },
    executing: {
      on: {
        [HarmonyEvent.EXECUTION_COMPLETE]: "connected",
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: [
            assign({
              error: ({ event }) => {
                if (event.type === HarmonyEvent.ERROR) {
                  return event.error;
                }
                return undefined;
              }
            })
          ]
        }
      }
    },
    error: {
      on: {
        [HarmonyEvent.RESET]: {
          target: "idle",
          actions: [
            assign({
              error: () => undefined,
              selectedHub: () => null,
              hubs: () => []
            })
          ]
        }
      }
    }
  }
});
