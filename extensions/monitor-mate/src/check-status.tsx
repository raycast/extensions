import { showToast, Toast, LaunchProps, environment, getPreferenceValues } from "@raycast/api";
import { fetchResources, updateResourceList, isHostAvailable, playSound } from "./utils";

interface StatusResult {
  status: boolean;
  lastChecked: string;
}

export default async function checkStatus(LaunchProps: LaunchProps) {
  const { launchType } = LaunchProps;

  const { alertSound } = getPreferenceValues();

  try {
    const resources = await fetchResources();

    if (resources.length === 0) {
      console.log("No resources to check.");
      return;
    }

    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];

      console.log(`Checking resource: ${resource.url}`);

      try {
        const statusResult = (await isHostAvailable(resource)) as StatusResult;

        let updatedStatusHistory = [
          ...resource.statusHistory,
          { status: statusResult.status, timestamp: statusResult.lastChecked },
        ];

        const maxStatusHistory = 30;

        if (updatedStatusHistory.length > maxStatusHistory) {
          updatedStatusHistory = updatedStatusHistory.slice(-maxStatusHistory);
        }

        const updatedResource = {
          ...resource,
          ...statusResult,
          statusHistory: updatedStatusHistory,
        };

        await updateResourceList(updatedResource, i);

        if (!statusResult.status && launchType === "userInitiated") {
          await showToast(Toast.Style.Failure, "Resource Unreachable", `Resource at ${resource.url} is not reachable.`);

          // play sound when alertSound is true
          if (alertSound) {
            playSound(`${environment.assetsPath}/alert.mp3`);
          }
        } else if (statusResult.status === false && alertSound) {
          playSound(`${environment.assetsPath}/alert.mp3`);
        }
      } catch (error) {
        console.error(`Error checking resource ${resource.url}:`, error);
      }
    }
  } catch (error) {
    console.error("Failed to check resources:", error);
  }
}
