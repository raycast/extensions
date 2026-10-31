import type { CliSetup } from "./detection";
import type { CliOperation } from "./installation";

export type CliSetupLifecycle =
  | { status: "checking" }
  | { status: "ready"; setup: CliSetup }
  | { status: "running"; setup: CliSetup; operation: CliOperation }
  | { status: "failed"; setup?: CliSetup; error: string };

export type CliSetupLifecycleAction =
  | { type: "check" }
  | { type: "ready"; setup: CliSetup }
  | { type: "run"; operation: CliOperation }
  | { type: "failed"; error: string };

export function cliSetupLifecycleReducer(state: CliSetupLifecycle, action: CliSetupLifecycleAction): CliSetupLifecycle {
  switch (action.type) {
    case "check":
      return state.status === "checking" || state.status === "running" ? state : { status: "checking" };
    case "ready":
      return { status: "ready", setup: action.setup };
    case "run":
      return state.status === "ready" ? { status: "running", setup: state.setup, operation: action.operation } : state;
    case "failed":
      return {
        status: "failed",
        setup: state.status === "running" || state.status === "ready" ? state.setup : undefined,
        error: action.error,
      };
  }
}

export const INITIAL_LIFECYCLE: CliSetupLifecycle = { status: "checking" };
