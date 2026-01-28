import { XcodeRuntimePlatform } from "./xcode-runtime-platform.model";
import { XcodeRuntime } from "./xcode-runtime.model";

/**
 * XcodeRuntimeGroup
 */
export interface XcodeRuntimeGroup {
  /**
   * The platform
   */
  platform: XcodeRuntimePlatform;
  /**
   * The XcodeRuntimes
   */
  runtimes: XcodeRuntime[];
}
