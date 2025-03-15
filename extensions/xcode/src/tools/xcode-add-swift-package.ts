import { XcodeSwiftPackageService } from "../services/xcode-swift-package.service";

type Input = {
  /**
   * The URL of the Swift Package must be either an HTTPS or SSH URL to a Git repository that contains a "Package.swift" file.
   */
  swiftPackageUrl: string;
  /**
   * The file path to either an Xcode project (XcodeProjectType.project) or workspace (XcodeProjectType.workspace) where the Swift Package should be added.
   * The Xcode project must either be a .xcodeproj or .xcworkspace file.
   */
  xcodeProjectFilePath: string;
};

export default (input: Input) =>
  XcodeSwiftPackageService.addSwiftPackage(input.swiftPackageUrl, input.xcodeProjectFilePath);
