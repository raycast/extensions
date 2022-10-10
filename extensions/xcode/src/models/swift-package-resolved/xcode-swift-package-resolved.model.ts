import { XcodeSwiftPackageResolvedEntry } from "./xcode-swift-package-resolved-entry.model";

/**
 * Xcode Swift Package Resolved
 */
export interface XcodeSwiftPackageResolved {
  /**
   * The path
   */
  path: string;
  /**
   * The entries
   */
  entries: XcodeSwiftPackageResolvedEntry[];
}
