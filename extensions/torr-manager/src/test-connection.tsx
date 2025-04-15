import { ActionPanel, Action, List, Icon, getPreferenceValues, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from "react";

import { getAuthHeaders, handleDomain, timeoutFetch } from "./utils";
import { PassThrough } from "stream";
import { BasePreferences } from "./models";

export default function TestConnectionCommand() {
  const { torrserverUrl } = getPreferenceValues<BasePreferences>();

  const [connectionStatus, setConnectionStatus] = useState<string>("Starting connection test...");
  const [loginStatus, setLoginStatus] = useState<string>("");
  const [speedStatus, setSpeedStatus] = useState<string>("Checking connection speed...");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [averageSpeed, setAverageSpeed] = useState<string>("");
  const [downloadProgress, setDownloadProgress] = useState<string>("0/100%");
  let checkInProgress = false;

  const testConnection = async () => {
    if (checkInProgress) {
      return;
    }
    checkInProgress = true;

    setConnectionStatus("Trying to connect...");
    showToast(Toast.Style.Animated, "Connecting...", "Please wait...");

    try {
      const response = await timeoutFetch(`${handleDomain(torrserverUrl)}`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setConnectionStatus("Server responded, but unauthorized: Invalid credentials");
          showToast(Toast.Style.Failure, "Error", "Unauthorized: Invalid credentials");
          setLoginStatus("Login failed: Invalid credentials");
          setDownloadProgress("-");
        } else {
          setConnectionStatus("Error: Failed to connect to the server");
          setLoginStatus("Login failed: Invalid credentials");
          setDownloadProgress("-");
          showToast(Toast.Style.Failure, "Error", "Failed to connect to the server");
        }
        setIsLoading(false);
        checkInProgress = false;
        return;
      }

      setConnectionStatus(`Connected to ${torrserverUrl}`);
      setLoginStatus("Login successful");

      await testDownloadSpeed(handleDomain(torrserverUrl));
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setConnectionStatus(`Error: Could not connect to ${torrserverUrl}`);
      setLoginStatus("-");
      setDownloadProgress("-");
      showToast(Toast.Style.Failure, "Connection Error", "Could not connect to the server");
      setIsLoading(false);
      checkInProgress = false;
    }
  };

  const testDownloadSpeed = async (baseUrl: string) => {
    const downloadSizeInMBytes = 80;
    const downloadUrl = `${baseUrl}/download/${downloadSizeInMBytes}`;
    const totalSizeInBytes = downloadSizeInMBytes * 1024 * 1024;
    const startTime = performance.now();

    setSpeedStatus("Checking connection speed...");
    showToast(Toast.Style.Animated, "Testing Speed", "Checking connection speed...");

    try {
      const response = await timeoutFetch(downloadUrl, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
          accept: "application/octet-stream",
        },
      });

      if (!response.ok || !response.body) {
        setSpeedStatus("Error: Failed to download file");
        showToast(Toast.Style.Failure, "Download Error", "Failed to download file");
        setIsLoading(false);
        checkInProgress = false;
        return;
      }

      const passThrough = new PassThrough();
      response.body.pipe(passThrough);

      let accumulatedBytes = 0;

      passThrough.on("data", (chunk) => {
        accumulatedBytes += chunk.length;
        const progressPercentage = ((accumulatedBytes / totalSizeInBytes) * 100).toFixed(0);
        setDownloadProgress(`${progressPercentage}/100%`);
      });

      passThrough.on("end", () => {
        const endTime = performance.now();
        const timeTakenInSeconds = (endTime - startTime) / 1000;

        const averageSpeedMBps = accumulatedBytes / (timeTakenInSeconds * 1024 * 1024);
        const averageSpeedMbps = averageSpeedMBps * 8;

        setSpeedStatus("Download completed");
        setAverageSpeed(`Average speed: ${averageSpeedMbps.toFixed(2)} Mbps`);
        setIsLoading(false);
        setDownloadProgress("100/100%");
        checkInProgress = false;

        showToast(Toast.Style.Success, "Download Complete", `Average speed: ${averageSpeedMbps.toFixed(2)} Mbps`);
      });

      passThrough.on("error", () => {
        setSpeedStatus("Error: Failed to test download speed");
        showToast(Toast.Style.Failure, "Speed Test Error", "Failed to test download speed");
        setIsLoading(false);
        checkInProgress = false;
      });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setSpeedStatus("Error: Failed to test download speed");
      showToast(Toast.Style.Failure, "Speed Test Error", "Failed to test download speed");
      setIsLoading(false);
      checkInProgress = false;
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Connection Status"
        icon={Icon.Globe}
        accessories={[{ text: connectionStatus }]}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={testConnection} />
          </ActionPanel>
        }
      />
      <List.Item
        title="Login Status"
        icon={Icon.LockUnlocked}
        accessories={[{ text: loginStatus || "Waiting for connection..." }]}
      />
      <List.Item
        title="Connection Speed"
        icon={Icon.Download}
        accessories={[{ text: downloadProgress || speedStatus }]}
      />
      {speedStatus.includes("completed") && (
        <List.Item
          title="All checks finished"
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          accessories={[{ text: averageSpeed }]}
        />
      )}
    </List>
  );
}
