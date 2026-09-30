import { XcodeSimulatorService } from "../services/xcode-simulator.service";

type Input = {
  /** The udid of the Xcode Simulator to shut down. */
  xcodeSimulatorUDID: string;
};

/**
 * Shuts down an Xcode Simulator via its UDID.
 * @param input
 */
export default (input: Input) => XcodeSimulatorService.shutdown(input.xcodeSimulatorUDID);
