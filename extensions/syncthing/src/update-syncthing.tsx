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
  const API_KEY = getPreferenceValues().api_key;
  const BASE_URL = getPreferenceValues().base_url;

  const headers = {
    "X-API-Key": API_KEY,
    Accept: "application/json",
  };

  try {
    const res = await fetch(BASE_URL + "/system/upgrade", { headers });
    if (!res.ok) {
      throw new Error(`Failed to check for updates: ${res.status}`);
    }
    const data = (await res.json()) as SyncthingUpgradeApiResponse;
    const updateInfo: UpdateInfo = {
      currVersion: data.running,
      newVersion: data.latest,
      newer: data.newer,
      majorNewer: data.majorNewer,
    };
    return updateInfo;
  } catch {
    return undefined;
  }
}

async function applyUpdate() {
  const API_KEY = getPreferenceValues().api_key;
  const BASE_URL = getPreferenceValues().base_url;
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
      showToast({
        title: "Update Applied",
        message: "Syncthing has been updated successfully.",
        style: Toast.Style.Success,
      });
    } else {
      showToast({
        title: "Update Failed",
        message:
          "Failed to apply the update. Please check the console for details.",
        style: Toast.Style.Failure,
      });
    }
  } catch {
    showToast({
      title: "Error",
      message:
        "An error occurred while applying the update. Please check the console for details.",
      style: Toast.Style.Failure,
    });
  }
}

function buildUpdateMarkdown(updateInfo: UpdateInfo) {
  return `
# ${updateInfo.newer ? (updateInfo.majorNewer ? "Major Update Available!" : "Update Available!") : "Syncthing is Up to Date"}

**Current Version:** ${updateInfo.currVersion}  
**Latest Version:** ${updateInfo.newVersion}
    `;
}

export default function Command() {
  const [markdown, setMarkdown] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>();

  useEffect(() => {
    const loadUpdateInfo = async () => {
      try {
        const info = await checkForUpdates();
        if (!info) {
          setMarkdown("# Error\n\nFailed to check for updates.");
          return;
        }
        setUpdateInfo(info);
        setMarkdown(buildUpdateMarkdown(info));
      } finally {
        setLoading(false);
      }
    };

    loadUpdateInfo();
  }, []);

  return (
    <Detail
      markdown={markdown}
      isLoading={loading}
      actions={
        <ActionPanel>
          {updateInfo?.newer ? (
            <Action
              title="Update Syncthing"
              onAction={async () => {
                await applyUpdate();
              }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
