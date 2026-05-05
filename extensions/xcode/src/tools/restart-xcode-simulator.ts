import { XcodeSimulatorService } from "../services/xcode-simulator.service";

type Input = {
  /** The udid of the Xcode Simulator to restart. */
  xcodeSimulatorUDID: string;
};

/**
 * Restarts an Xcode Simulator via its UDID.
 * @param input The input.
 */
export default (input: Input) => XcodeSimulatorService.restart(input.xcodeSimulatorUDID);
