import { execAsync } from "../shared/exec-async";
import { runAppleScript } from "../shared/run-apple-script";
import { readDirectoryAsync } from "../shared/fs-async";
import Path from "path";
import untildify from "untildify";

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
   * Remove Derived Data directory for a given app
   * @param appName The name of the app
   */
  static removeDerivedData(appName: string): Promise<void> {
    const derivedDataPath = untildify("~/Library/Developer/Xcode/DerivedData");
    return readDirectoryAsync(derivedDataPath).then((directories) => {
      const directory = directories.find((directory) => directory.split("-").slice(0, -1).join("-") === appName);
      if (!directory) {
        return Promise.resolve();
      }
      return runAppleScript(
        `tell application "Finder" to delete POSIX file "${Path.join(derivedDataPath, directory)}"`
      ).then();
    });
  }

  /**
   * Clear Swift Package Manager Cache
   */
  static clearSwiftPackageManagerCache(): Promise<void> {
    return execAsync("rm -rf ~/Library/org.swift.swiftpm && rm -rf ~/Library/Caches/org.swift.swiftpm").then();
  }

  /**
   * Clear SwiftUI Previews Cache
   */
  static clearSwiftUIPreviewsCache(): Promise<void> {
    return execAsync("rm -rf ~/Library/Developer/Xcode/UserData/Previews").then();
  }

  /**
   * Delete unsupported Simulators
   */
  static deleteUnsupportedSimulators(): Promise<void> {
    return execAsync("xcrun simctl delete unavailable").then();
  }
}
