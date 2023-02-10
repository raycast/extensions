import { execAsync } from "../shared/exec-async";
import { getApplications } from "@raycast/api";

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
   * Xcode download url (Mac App Store)
   */
  static get downloadUrl(): string {
    return "https://apps.apple.com/app/id497799835";
  }

  /**
   * Xcode Developer Documentation URL Scheme
   */
  static get developerDocumentationURLScheme(): string {
    return "x-xcode-documentation://";
  }

  /**
   * Retrieve boolean if Xcode is installed
   */
  static async isXcodeInstalled(): Promise<boolean> {
    const applications = await getApplications();
    return !!applications.find((application) => application.bundleId === XcodeService.bundleIdentifier);
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
