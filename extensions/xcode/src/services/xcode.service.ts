import { execAsync } from "../shared/exec-async";

/**
 * XcodeService
 */
export class XcodeService {
  /**
   * Retrieve boolean if Xcode is currently running
   */
  async isXcodeRunning(): Promise<boolean> {
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
  launchXcode(): Promise<void> {
    return execAsync(
      [
        // Open Xcode in background (-j)
        // via bundle identifier (-b)
        "open -j -b com.apple.dt.xcode",
        // Sleep for two seconds to ensure
        // the process is truly running
        "sleep 2",
      ].join(" && ")
    ).then();
  }
}
