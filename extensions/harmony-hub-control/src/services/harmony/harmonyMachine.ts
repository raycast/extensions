/**
 * State machine for managing Harmony Hub states and transitions.
 * @module
 */

import { createMachine } from "xstate";

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
const START_CONNECTION = "START_CONNECTION";
const HUB_DISCOVERED = "HUB_DISCOVERED";
const ERROR = "ERROR";
const RESET = "RESET";

export type HarmonyEvents =
  | { type: typeof START_CONNECTION; hub: HarmonyHub }
  | { type: typeof HUB_DISCOVERED; hub: HarmonyHub }
  | { type: typeof ERROR; error: Error }
  | { type: typeof RESET };

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
  states: {
    idle: {
      on: {
        [START_CONNECTION]: "connecting",
      },
    },
    connecting: {
      on: {
        [ERROR]: "error",
      },
    },
    error: {
      on: {
        [RESET]: "idle",
      },
    },
  },
});
