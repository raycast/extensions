import { Action, ActionPanel, Detail, showToast, Toast, Icon, confirmAlert } from "@raycast/api";
import { NestCamera } from "../types";
import { NestDeviceService } from "../services/camera/NestDeviceService";
import { QuickAccessService } from "../services/quickaccess/QuickAccessService";
import { OAuthManager } from "../services/auth/OAuthManager";
import { useEffect, useState } from "react";

interface CameraViewProps {
  camera: NestCamera;
}

export function CameraView({ camera }: CameraViewProps): JSX.Element {
  const [isQuickAccess, setIsQuickAccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkQuickAccess = async () => {
      setIsLoading(true);
      try {
        const quickAccessService = QuickAccessService.getInstance();
        const isQuick = await quickAccessService.isQuickAccessCamera(camera.id);
        setIsQuickAccess(isQuick);
      } catch (error) {
        console.error("Error checking quick access status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkQuickAccess();
  }, [camera.id]);

  const handleStreamOpen = async () => {
    try {
      const deviceService = NestDeviceService.getInstance();
      await deviceService.openStream(camera.id);
    } catch (error) {
      console.error("Failed to open stream:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Stream",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  };

  const handleSetQuickAccess = async () => {
    try {
      const quickAccessService = QuickAccessService.getInstance();

      if (isQuickAccess) {
        // Remove quick access
        await quickAccessService.clearQuickAccessCamera();
        setIsQuickAccess(false);
        await showToast({
          style: Toast.Style.Success,
          title: "Quick Access Removed",
          message: `${camera.name} is no longer the quick access camera`,
        });
      } else {
        // Set as quick access
        await quickAccessService.setQuickAccessCamera(camera);
        setIsQuickAccess(true);
        await showToast({
          style: Toast.Style.Success,
          title: "Quick Access Set",
          message: `${camera.name} is now your quick access camera`,
        });
      }
    } catch (error) {
      console.error("Error setting quick access camera:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to set quick access camera",
      });
    }
  };

  const handleResetCredentials = async () => {
    const confirmed = await confirmAlert({
      title: "Reset OAuth Credentials",
      message:
        "Are you sure you want to reset your Google OAuth credentials? You will need to re-authenticate to use the extension.",
      primaryAction: {
        title: "Reset Credentials",
      },
      icon: Icon.Key,
    });

    if (confirmed) {
      try {
        const oauthManager = OAuthManager.getInstance();
        await oauthManager.clearTokens();

        await showToast({
          style: Toast.Style.Success,
          title: "Credentials Reset",
          message: "Your OAuth credentials have been reset. Please restart the extension to re-authenticate.",
        });
      } catch (error) {
        console.error("Error resetting credentials:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: "Failed to reset credentials",
        });
      }
    }
  };

  const getStreamingStatus = () => {
    if (!camera.traits.online) {
      return "🔴 Offline";
    }
    if (camera.traits.streamingSupport === "RTSP") {
      return "✅ RTSP Ready";
    }
    return "❌ Streaming Not Supported";
  };

  const getStreamingInstructions = () => {
    if (!camera.traits.online) {
      return "Camera is currently offline. Please check your camera's power and network connection.";
    }
    if (camera.traits.streamingSupport === "RTSP") {
      return "Click the actions below to start streaming with RTSP.";
    }
    return "This camera does not support streaming. Please check your camera model and settings.";
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={`
# ${camera.name}
${camera.roomHint ? `**Location**: ${camera.roomHint}` : ""}
**Status**: ${camera.traits.online ? "🟢 Online" : "🔴 Offline"}
**Streaming**: ${getStreamingStatus()}
**Quick Access**: ${isQuickAccess ? "✅ Enabled" : "❌ Disabled"}

${getStreamingInstructions()}

${isQuickAccess ? "This camera is set as your quick access camera. You can launch it directly from the Quick Access command." : "Set this camera as your quick access camera to launch it directly from the Quick Access command."}
      `}
      actions={
        <ActionPanel>
          {camera.traits.online && camera.traits.streamingSupport === "RTSP" && (
            <Action
              title="Start Stream"
              icon={Icon.Video}
              onAction={handleStreamOpen}
              shortcut={{ modifiers: ["cmd"], key: "s" }}
            />
          )}
          <Action
            title={isQuickAccess ? "Remove Quick Access" : "Set as Quick Access"}
            icon={isQuickAccess ? Icon.StarDisabled : Icon.Star}
            onAction={handleSetQuickAccess}
            shortcut={{ modifiers: ["cmd"], key: "q" }}
          />
          <Action.OpenInBrowser
            title="Open in Google Home"
            url={`https://home.google.com/cameras`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <ActionPanel.Section title="Advanced">
            <Action
              title="Reset Oauth Credentials"
              icon={Icon.Key}
              onAction={handleResetCredentials}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              style={Action.Style.Destructive}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
