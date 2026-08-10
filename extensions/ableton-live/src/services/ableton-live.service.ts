import { execAsync } from "../shared/exec-async";
import { getApplications } from "@raycast/api";

export class AbletonLiveService {
  static get bundleIdentifier(): string {
    return "com.ableton.live";
  }

  static async isAbletonInstalled(): Promise<boolean> {
    const applications = await getApplications();
    return !!applications.find((application) => application.bundleId === AbletonLiveService.bundleIdentifier);
  }

  static launchAbletonLive(): Promise<void> {
    return execAsync(
      [
        // Open Ableton Live in background (-j)
        // via bundle identifier (-b)
        `open -j -b ${AbletonLiveService.bundleIdentifier}`,
        // Sleep for two seconds to ensure
        // the process is truly running
        "sleep 2",
      ].join(" && ")
    ).then();
  }
}
