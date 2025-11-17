import { XcodeSimulatorService } from "../services/xcode-simulator.service";

type Input = {
  /** The URL to open in the Xcode Simulator. */
  url: string;
  /** The optional udid of the Xcode Simulator to open the URL in. */
  xcodeSimulatorUDID?: string;
};

/**
 * Opens a URL in the Xcode Simulator.
 * @param input The input.
 */
export default (input: Input) => XcodeSimulatorService.openUrl(input.url, input.xcodeSimulatorUDID);
