import { XcodeSwiftPackageType } from "./xcode-swift-package-type.model";

/**
 * A Xcode Swift Package
 */
export interface XcodeSwiftPackage {
  /**
   * The name
   */
  name: string;
  /**
   * The XcodeSwiftPackageType
   */
  type: XcodeSwiftPackageType;
  /**
   * The path
   */
  path: string;
  /**
   * Open Swift Package
   */
  open: () => Promise<void>;
}
