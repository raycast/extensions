import React from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LocalStorage,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { initDeviceLink, checkDeviceStatus } from "./lib/api";
import { randomBytes } from "crypto";

export default function ConnectDevice() {
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<
    "initializing" | "pending" | "approved" | "rejected" | "expired"
  >("initializing");
  const { pop } = useNavigation();

  useEffect(() => {
    initializeDeviceConnection();
  }, []);

  async function initializeDeviceConnection() {
    try {
      // Generate a unique device ID if not exists
      let deviceId = await LocalStorage.getItem<string>("device-id");
      if (!deviceId) {
        deviceId = randomBytes(16).toString("hex");
        await LocalStorage.setItem("device-id", deviceId);
      }

      const deviceName = `Raycast on ${process.platform}`;

      // Initialize device link
      const response = await initDeviceLink(deviceId, deviceName);

      setCode(response.code);
      setUrl(response.url);
      setStatus("pending");
      setIsLoading(false);

      // Automatically open the web app with the pairing code
      if (response.url) {
        await open(response.url);
      }

      // Start polling for approval
      pollDeviceStatus(response.code);
    } catch (err) {
      setError(String(err));
      setIsLoading(false);
    }
  }

  async function pollDeviceStatus(linkCode: string) {
    const maxAttempts = 60; // Poll for 5 minutes (every 5 seconds)
    let attempts = 0;

    const poll = async () => {
      if (attempts >= maxAttempts) {
        setStatus("expired");
        await showToast({
          style: Toast.Style.Failure,
          title: "Connection Expired",
          message: "Please try again",
        });
        return;
      }

      try {
        const statusResponse = await checkDeviceStatus(linkCode);

        if (statusResponse.status === "approved" && statusResponse.token) {
          // Save the token
          await LocalStorage.setItem("device-token", statusResponse.token);

          // Save user info if available
          if (statusResponse.user) {
            await LocalStorage.setItem("user-email", statusResponse.user.email);
            if (statusResponse.user.name) {
              await LocalStorage.setItem("user-name", statusResponse.user.name);
            }
          }

          setStatus("approved");
          await showHUD("✅ Device connected successfully!");

          // Close the view after a short delay
          setTimeout(() => {
            pop();
          }, 1000);
          return;
        }

        if (statusResponse.status === "rejected") {
          setStatus("rejected");
          await showToast({
            style: Toast.Style.Failure,
            title: "Connection Rejected",
            message: "The connection was rejected from the web app",
          });
          return;
        }

        if (statusResponse.status === "expired") {
          setStatus("expired");
          await showToast({
            style: Toast.Style.Failure,
            title: "Code Expired",
            message: "Please try again",
          });
          return;
        }

        // Still pending, continue polling
        attempts++;
        setTimeout(poll, 5000);
      } catch (err) {
        console.error("Polling error:", err);
        attempts++;
        setTimeout(poll, 5000);
      }
    };

    poll();
  }

  function getMarkdown() {
    if (error) {
      return `# ❌ Connection Failed\n\n${error}\n\nPlease try again or use an API token instead.`;
    }

    if (status === "initializing" || isLoading) {
      return `# 🔄 Initializing...\n\nSetting up device connection...`;
    }

    if (status === "approved") {
      return `# ✅ Connected!\n\nYour device has been successfully connected to Bucket.\n\nYou can now close this window and start using Bucket commands.`;
    }

    if (status === "rejected") {
      return `# ❌ Connection Rejected\n\nThe connection request was rejected from the web app.\n\nPlease try again or contact support if you need help.`;
    }

    if (status === "expired") {
      return `# ⏰ Code Expired\n\nThe connection code has expired.\n\nPlease try connecting again to get a new code.`;
    }

    // Pending state
    const formattedCode = code
      ? `${code.slice(0, 3)}-${code.slice(3)}`
      : "------";

    return `# 🔗 Connect Your Device

## Your Pairing Code

\`\`\`
${formattedCode}
\`\`\`

## Instructions

1. Open the Bucket web app in your browser
2. Go to **Settings → Connect Device**
3. Enter the code shown above
4. Approve the connection

The code will expire in **15 minutes**.

---

**Waiting for approval...**

This window will automatically close once the connection is approved.`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={getMarkdown()}
      actions={
        <ActionPanel>
          {url && status === "pending" && (
            <Action
              title="Open Web App"
              icon={Icon.Globe}
              onAction={() => open(url)}
            />
          )}
          {code && status === "pending" && (
            <Action.CopyToClipboard
              title="Copy Code"
              content={code}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          )}
          {(status === "rejected" || status === "expired" || error) && (
            <Action
              title="Try Again"
              icon={Icon.RotateClockwise}
              onAction={() => {
                setError(null);
                setStatus("initializing");
                setIsLoading(true);
                initializeDeviceConnection();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
