import { XcodeSimulator } from "./xcode-simulator.model";

/**
 * An Application that is installed in a Xcode Simulator
 */
export interface XcodeSimulatorApplication {
  /**
   * The identifier
   */
  id: string;
  /**
   * The name of the application
   */
  name: string;
  /**
   * The bundle identifier
   */
  bundleIdentifier: string;
  /**
   * The optional version
   */
  version?: string;
  /**
   * The optional build number
   */
  buildNumber?: string;
  /**
   * The optional app icon path
   */
  appIconPath?: string;
  /**
   * The corresponding XcodeSimulator
   * where the application is installed
   */
  simulator: XcodeSimulator;
  /**
   * The Bundle directory path
   */
  bundlePath: string;
  /**
   * The SandBox directory path
   */
  sandBoxPath: string;
  /**
   * The SandBox Documents directory path
   */
  sandBoxDocumentsPath: string;
  /**
   * The SandBox Caches directory path
   */
  sandBoxCachesPath: string;
  /**
   * The AppGroup directory path
   */
  appGroupPath?: string;
  /**
   * The UserDefaults plist path
   */
  userDefaultsPlistPath?: string;
}
