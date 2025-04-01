import { XcodeSimulatorService } from "../services/xcode-simulator.service";

type Input = {
  /** The udid of the Xcode Simulator to boot. */
  xcodeSimulatorUDID: string;
};

/**
 * Boots an Xcode Simulator via its UDID.
 * @param input The input.
 */
export default (input: Input) => XcodeSimulatorService.boot(input.xcodeSimulatorUDID);
