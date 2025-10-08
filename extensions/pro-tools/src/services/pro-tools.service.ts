import { execAsync } from "../shared/exec-async";
import { getApplications } from "@raycast/api";

export class ProToolsService {
  static get bundleIdentifier(): string {
    return "com.avid.ProTools";
  }

  static async isProToolsInstalled(): Promise<boolean> {
    const applications = await getApplications();
    return !!applications.find(
      (application) => application.bundleId === ProToolsService.bundleIdentifier
    );
  }

  static launchProTools(): Promise<void> {
    return execAsync(
      [
        // Open Pro Tools in background (-j)
        // via bundle identifier (-b)
        `open -j -b ${ProToolsService.bundleIdentifier}`,
        // Sleep for two seconds to ensure
        // the process is truly running
        "sleep 2",
      ].join(" && ")
    );
  }
}
