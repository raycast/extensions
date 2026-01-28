import { XcodeSimulator } from "./xcode-simulator.model";

/**
 * XcodeSimulatorGroup
 */
export interface XcodeSimulatorGroup {
  /**
   * The runtime
   */
  runtime: string;
  /**
   * The XcodeSimulators
   */
  simulators: XcodeSimulator[];
}
