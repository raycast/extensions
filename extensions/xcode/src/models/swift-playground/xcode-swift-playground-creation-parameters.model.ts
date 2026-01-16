import { XcodeSwiftPlaygroundPlatform } from "./xcode-swift-playground-platform.model";
import { XcodeSwiftPlaygroundTemplate } from "./xcode-swift-playground-template.model";
import { XcodeSwiftPlaygroundSwiftVersion } from "./xcode-swift-playground-swift-version.model";

/**
 * Xcode Swift Playground creation parameters
 */
export interface XcodeSwiftPlaygroundCreationParameters {
  /**
   * The name
   */
  name: string;
  /**
   * The location
   */
  location: string;
  /**
   * The XcodeSwiftPlaygroundPlatform
   */
  platform: XcodeSwiftPlaygroundPlatform;
  /**
   * The Swift version
   */
  swiftVersion: XcodeSwiftPlaygroundSwiftVersion;
  /**
   * The XcodeSwiftPlaygroundTemplate
   */
  template: XcodeSwiftPlaygroundTemplate;
}
