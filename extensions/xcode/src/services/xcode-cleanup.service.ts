import { execAsync } from "../shared/exec-async";
import { runAppleScript } from "../shared/run-apple-script";

/**
 * XcodeCleanupService
 */
export class XcodeCleanupService {
  /**
   * Clear the Xcode Derived Data directory
   */
  static clearDerivedData(): Promise<void> {
    return runAppleScript([
      'set dd to (path to home folder as string) & "Library:Developer:Xcode:DerivedData"',
      'tell application "Finder"',
      "if dd exists then",
      "move dd to trash",
      "end if",
      "end tell",
    ]).then();
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
