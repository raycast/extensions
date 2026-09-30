import { XcodeSwiftPackageType } from "./xcode-swift-package-type.model";

/**
 * The Xcode Swift Package creation parameters
 */
export interface XcodeSwiftPackageCreationParameters {
  /**
   * The name
   */
  name: string;
  /**
   * The location
   */
  location: string;
  /**
   * The XcodeSwiftPackageType
   */
  type: XcodeSwiftPackageType;
}
