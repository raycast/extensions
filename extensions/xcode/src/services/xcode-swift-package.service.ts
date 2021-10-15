import { XcodeSwiftPackage } from "../models/swift-package/xcode-swift-package.model";
import { execAsync } from "../shared/exec-async";
import { XcodeSwiftPackageCreationParameters } from "../models/swift-package/xcode-swift-package-creation-parameters.model";
import * as Path from "path";

/**
 * XcodeSwiftPackageService
 */
export class XcodeSwiftPackageService {

  /**
   * Create Swift Package from parameters
   */
  createSwiftPackage(
    parameters: XcodeSwiftPackageCreationParameters
  ): Promise<XcodeSwiftPackage> {
    // Initialize Swift Package path
    const swiftPackagePath = Path.join(parameters.location, parameters.name)
    // Execute command
    return execAsync(
      [
        // Make directory
        `mkdir -p ${swiftPackagePath}`,
        // Switch to directory
        `cd ${swiftPackagePath}`,
        // Create Swift Package
        [
          "swift",
          "package",
          "init",
          "--name",
          parameters.name,
          "--type",
          parameters.type
        ].join(" ")
      ].join(" && ")
    ).then(() => {
      // Return Swift Package
      return {
        name: parameters.name,
        type: parameters.type,
        path: swiftPackagePath,
        open: () => {
          // Open Package.swift
          return execAsync(
            `open ${swiftPackagePath}/Package.swift`
          ).then();
        }
      }
    })
  }

}
