import { XcodeSwiftPlaygroundPlatform } from "./xcode-swift-playground-platform.model";
import { XcodeSwiftPlaygroundTemplate } from "./xcode-swift-playground-template.model";

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
   * The XcodeSwiftPlaygroundTemplate
   */
  template: XcodeSwiftPlaygroundTemplate;
}
