import { execAsync } from "../shared/exec-async";

/**
 * XcodeService
 */
export class XcodeService {
  /**
   * Xcode application bundle identifier
   */
  static get bundleIdentifier(): string {
    return "com.apple.dt.Xcode";
  }

  /**
   * Retrieve boolean if Xcode is currently running
   */
  static async isXcodeRunning(): Promise<boolean> {
    try {
      // prep Xcode process status
      const output = await execAsync("pgrep Xcode");
      // Xcode is running if standard output is not empty
      return output.stdout.trim().length !== 0;
    } catch {
      // On error Xcode is not running
      return false;
    }
  }

  /**
   * Launch Xcode
   */
  static launchXcode(): Promise<void> {
    return execAsync(
      [
        // Open Xcode in background (-j)
        // via bundle identifier (-b)
        `open -j -b ${XcodeService.bundleIdentifier}`,
        // Sleep for two seconds to ensure
        // the process is truly running
        "sleep 2",
      ].join(" && ")
    ).then();
  }
}
