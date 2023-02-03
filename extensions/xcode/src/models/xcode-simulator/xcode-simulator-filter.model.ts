import { XcodeSimulatorState } from "./xcode-simulator-state.model";

export enum XcodeSimulatorFilter {
  /**
   * Booted
   */
  booted = "Booted",
  /**
   * All
   */
  all = "All",
  /**
   * Shutdown
   */
  shutdown = "Shutdown",
}

export function simulatorStateForFilter(filter: XcodeSimulatorFilter | undefined): XcodeSimulatorState | null {
  switch (filter) {
    case XcodeSimulatorFilter.booted:
      return XcodeSimulatorState.booted;
    case XcodeSimulatorFilter.shutdown:
      return XcodeSimulatorState.shutdown;
    default:
      return null;
  }
}
