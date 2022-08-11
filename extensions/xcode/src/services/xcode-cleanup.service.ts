import { execAsync } from "../shared/exec-async";

/**
 * XcodeCleanupService
 */
export class XcodeCleanupService {
  /**
   * Clear the Xcode Derived Data directory
   */
  static clearDerivedData(): Promise<void> {
    return execAsync("rm -rf ~/Library/Developer/Xcode/DerivedData").then();
  }

  /**
   * Clear Swift Package Manager Cache
   */
  static clearSwiftPackageManagerCache(): Promise<void> {
    return execAsync("rm -rf ~/Library/Caches/org.swift.swiftpm/repositories").then();
  }

  /**
   * Delete unsupported Simulators
   */
  static deleteUnsupportedSimulators(): Promise<void> {
    return execAsync("xcrun simctl delete unavailable").then();
  }
}
