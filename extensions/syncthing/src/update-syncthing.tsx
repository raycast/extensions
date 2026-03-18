import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useEffect } from "react";

interface UpdateInfo {
  currVersion: string;
  newVersion: string;
  newer: boolean;
  majorNewer: boolean;
}

interface SyncthingUpgradeApiResponse {
  running: string;
  latest: string;
  newer: boolean;
  majorNewer: boolean;
}

async function checkForUpdates(): Promise<UpdateInfo | undefined> {
  // Check if an update is available
  const API_KEY = getPreferenceValues().api_key;
  const BASE_URL = getPreferenceValues().base_url;
  console.log(
    "Checking for Syncthing updates at " +
      BASE_URL +
      " with API key " +
      API_KEY,
  );

  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await fetch(BASE_URL + "/system/upgrade", { headers });
    const data = (await res.json()) as SyncthingUpgradeApiResponse;
    console.log("Upgrade check data: ", data);
    const updateInfo: UpdateInfo = {
      currVersion: data.running,
      newVersion: data.latest,
      newer: data.newer,
      majorNewer: data.majorNewer,
    };
    if (updateInfo.newer) {
      console.log(
        `Update available: ${updateInfo.currVersion} -> ${updateInfo.newVersion}`,
      );
    }
    return updateInfo;
  } catch (error) {
    console.error("Error checking for updates:", error);
    return undefined;
  }
}

async function applyUpdate() {
  // Apply the update
  const API_KEY = getPreferenceValues().api_key;
  const BASE_URL = getPreferenceValues().base_url;
  console.log(
    "Applying Syncthing update at " + BASE_URL + " with API key " + API_KEY,
  );
  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await fetch(BASE_URL + "/system/upgrade", {
      method: "POST",
      headers,
    });
    if (res.ok) {
      console.log("Update applied successfully.");
      showToast({
        title: "Update Applied",
        message: "Syncthing has been updated successfully.",
        style: Toast.Style.Success,
      });
    } else {
      console.error("Failed to apply update. Status: ", res.status);
      showToast({
        title: "Update Failed",
        message:
          "Failed to apply the update. Please check the console for details.",
        style: Toast.Style.Failure,
      });
    }
  } catch (error) {
    console.error("Error applying update: ", error);
    showToast({
      title: "Error",
      message:
        "An error occurred while applying the update. Please check the console for details.",
      style: Toast.Style.Failure,
    });
  }
}

async function generateUpdateDetail() {
  const updateInfo = await checkForUpdates();
  if (!updateInfo) {
    await showToast({
      title: "Error",
      message:
        "Failed to check for updates. Please check the console for more details.",
      style: Toast.Style.Failure,
    });
    return "# Error\n\nFailed to check for updates.";
  }

  return `
# ${updateInfo.newer ? (updateInfo.majorNewer ? "Major Update Available!" : "Update Available!") : "Syncthing is Up to Date"}

**Current Version:** ${updateInfo.currVersion}  
**Latest Version:** ${updateInfo.newVersion}
    `;
}

export default function Command() {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    generateUpdateDetail()
      .then(setMarkdown)
      .then(() => setLoading(false));
  }, []);

  return (
    <Detail
      markdown={markdown}
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action
            title="Update Syncthing"
            onAction={() => {
              applyUpdate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
