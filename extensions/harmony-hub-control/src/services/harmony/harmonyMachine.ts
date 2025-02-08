/**
 * State machine for managing Harmony Hub states and transitions.
 * @module
 */

import { assign, createMachine } from "xstate";
import { HarmonyHub, HarmonyDevice, HarmonyActivity } from "../../types/harmony";

/**
 * Context for the state machine.
 */
interface HarmonyContext {
  hubs: HarmonyHub[];
  selectedHub: HarmonyHub | null;
  error: Error | null;
  devices: HarmonyDevice[];
  activities: HarmonyActivity[];
}

/**
 * Events that can trigger state transitions.
 */
enum HarmonyEvent {
  /** Start connection */
  START_CONNECTION = "START_CONNECTION",
  /** Hub discovered */
  HUB_DISCOVERED = "HUB_DISCOVERED",
  /** Error occurred */
  ERROR = "ERROR",
  /** Reset state */
  RESET = "RESET",
}

type HarmonyStartConnectionEvent = {
  type: HarmonyEvent.START_CONNECTION;
  hub: HarmonyHub;
};

type HarmonyHubDiscoveredEvent = {
  type: HarmonyEvent.HUB_DISCOVERED;
  hub: HarmonyHub;
};

type HarmonyErrorEvent = {
  type: HarmonyEvent.ERROR;
  error: Error;
};

type HarmonyResetEvent = {
  type: HarmonyEvent.RESET;
};

type HarmonyEvents = HarmonyStartConnectionEvent | HarmonyHubDiscoveredEvent | HarmonyErrorEvent | HarmonyResetEvent;

const initialContext: HarmonyContext = {
  hubs: [],
  selectedHub: null,
  error: null,
  devices: [],
  activities: [],
};

export const harmonyMachine = createMachine({
  id: "harmony",
  initial: "idle",
  context: initialContext,
  schema: {
    context: {} as HarmonyContext,
    events: {} as HarmonyEvents,
  },
  states: {
    idle: {
      on: {
        [HarmonyEvent.START_CONNECTION]: {
          target: "connecting",
          actions: assign({
            selectedHub: (_, event) => (event as HarmonyStartConnectionEvent).hub,
          }),
        },
      },
    },
    connecting: {
      on: {
        [HarmonyEvent.HUB_DISCOVERED]: {
          actions: assign({
            hubs: (context, event) => [...context.hubs, (event as HarmonyHubDiscoveredEvent).hub],
          }),
        },
        [HarmonyEvent.ERROR]: {
          target: "error",
          actions: assign({
            error: (_, event) => (event as HarmonyErrorEvent).error,
          }),
        },
      },
    },
    error: {
      on: {
        [HarmonyEvent.RESET]: {
          target: "idle",
          actions: assign(() => initialContext),
        },
      },
    },
  },
});
