import { XcodeSimulatorState } from "./xcode-simulator-state.model";

/**
 * A Xcode Simulator
 */
export interface XcodeSimulator {
  /**
   * The udid
   * Note: No typo! udid is the field which the simctl responds with
   */
  udid: string;
  /**
   * The name
   */
  name: string;
  /**
   * The runtime e.g. iOS-15-0, tvOS-15-0
   */
  runtime: string;
  /**
   * The state e.g. Shutdown, Booted
   */
  state: XcodeSimulatorState;
  /**
   * The data file path
   */
  dataPath: string;
  /**
   * The last-used timestamp (0 if never used).
   * Populated from LocalStorage history.
   */
  lastUsed?: number;
}
