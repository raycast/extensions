import { XcodeSimulator } from "./xcode-simulator.model";
import { XcodeSimulatorApplication } from "./xcode-simulator-application.model";

/**
 * Xcode Simulator Application Group
 */
export interface XcodeSimulatorApplicationGroup {
  /**
   * The XcodeSimulator
   */
  simulator: XcodeSimulator;
  /**
   * The XcodeSimulatorApplications
   */
  applications: XcodeSimulatorApplication[];
}
