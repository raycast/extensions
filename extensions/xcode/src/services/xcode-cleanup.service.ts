import { execAsync } from "../shared/exec-async";

/**
 * XcodeCleanupService
 */
export class XcodeCleanupService {
  /**
   * Clear the Xcode Derived Data directory
   */
  clearDerivedData(): Promise<void> {
    return execAsync("rm -rf ~/Library/Developer/Xcode/DerivedData").then();
  }

  /**
   * Clear Swift Package Manager Cache
   */
  clearSwiftPackageManagerCache(): Promise<void> {
    return execAsync("rm -rf ~/Library/Caches/org.swift.swiftpm/repositories").then();
  }
}
