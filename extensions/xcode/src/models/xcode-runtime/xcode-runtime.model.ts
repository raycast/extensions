import { XcodeRuntimePlatform } from "./xcode-runtime-platform.model";

/**
 * A Xcode Runtime
 */
export interface XcodeRuntime {
  /**
   * The name
   */
  name: string;
  /**
   * The platform
   */
  platform: XcodeRuntimePlatform;
  /**
   * The version
   */
  version: string;

  /**
   * The build version
   */
  buildVersion: string;

  /**
   * The last time this runtime was used
   */
  lastUsageDate?: Date;

  /**
   * The supported status of this runtime
   */
  isSupported: boolean;
}
