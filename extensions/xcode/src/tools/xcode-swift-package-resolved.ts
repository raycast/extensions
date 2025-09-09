import { XcodeSwiftPackageResolvedService } from "../services/xcode-swift-package-resolved.service";

type Input = {
  /** The path to the directory containing the Xcode project. */
  xcodeProjectDirectoryPath: string;
};

/**
 * Retrieves the Swift Package Resolved file for an Xcode project.
 * @param input The input.
 */
export default (input: Input) => XcodeSwiftPackageResolvedService.getPackageResolved(input.xcodeProjectDirectoryPath);
