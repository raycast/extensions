import { List, Icon, ActionPanel, Action, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState, useEffect } from "react";
import { NestCamera } from "../types";
import { CameraView } from "./CameraView";
import { OAuthManager } from "../services/auth/OAuthManager";
import { QuickAccessService } from "../services/quickaccess/QuickAccessService";

// Helper functions for streaming support display
function getStreamingText(streamingSupport: "WEB_RTC" | "RTSP" | "NONE"): string {
  switch (streamingSupport) {
    case "WEB_RTC":
      return "WebRTC";
    case "RTSP":
      return "RTSP";
    case "NONE":
      return "No Streaming";
    default:
      return "Unknown";
  }
}

function getStreamingIcon(streamingSupport: "WEB_RTC" | "RTSP" | "NONE") {
  switch (streamingSupport) {
    case "WEB_RTC":
    case "RTSP":
      return Icon.Video;
    case "NONE":
      return Icon.VideoDisabled;
    default:
      return Icon.QuestionMark;
  }
}

interface CameraListProps {
  cameras: NestCamera[];
  isLoading: boolean;
  onOpenStream?: (camera: NestCamera) => Promise<void>;
}

export function CameraList({ cameras, isLoading, onOpenStream }: CameraListProps): JSX.Element {
  const [loadingCameraId, setLoadingCameraId] = useState<string | null>(null);
  const [quickAccessCameraId, setQuickAccessCameraId] = useState<string | null>(null);

  // Load quick access camera ID on component mount
  useEffect(() => {
    const loadQuickAccessCamera = async () => {
      const quickAccessService = QuickAccessService.getInstance();
      const cameraId = await quickAccessService.getQuickAccessCameraId();
      setQuickAccessCameraId(cameraId);
    };

    loadQuickAccessCamera();
  }, []);

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
        const authManager = OAuthManager.getInstance();
        await authManager.clearTokens();

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

  const handleOpenStream = async (camera: NestCamera) => {
    if (!onOpenStream) return;

    setLoadingCameraId(camera.id);

    try {
      await onOpenStream(camera);
    } catch (error) {
      console.error("Error opening stream:", error);
    } finally {
      setLoadingCameraId(null);
    }
  };

  const handleSetQuickAccess = async (camera: NestCamera) => {
    try {
      const quickAccessService = QuickAccessService.getInstance();

      // If this camera is already the quick access camera, clear it
      if (quickAccessCameraId === camera.id) {
        await quickAccessService.clearQuickAccessCamera();
        setQuickAccessCameraId(null);
        await showToast({
          style: Toast.Style.Success,
          title: "Quick Access Removed",
          message: `${camera.name} is no longer the quick access camera`,
        });
      } else {
        // Otherwise, set it as the quick access camera
        await quickAccessService.setQuickAccessCamera(camera);
        setQuickAccessCameraId(camera.id);
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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cameras..."
      actions={
        <ActionPanel>
          <Action
            title="Reset Oauth Credentials"
            icon={Icon.Key}
            onAction={handleResetCredentials}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            style={Action.Style.Destructive}
          />
        </ActionPanel>
      }
    >
      {cameras.map((camera) => {
        const isLoading = loadingCameraId === camera.id;
        const isQuickAccess = quickAccessCameraId === camera.id;

        return (
          <List.Item
            key={camera.id}
            title={isLoading ? `Launching ${camera.name}...` : camera.name}
            subtitle={
              isLoading ? "This can take 10+ seconds" : camera.roomHint ? `Room: ${camera.roomHint}` : undefined
            }
            icon={isLoading ? Icon.CircleProgress : camera.traits.online ? Icon.CheckCircle : Icon.XMarkCircle}
            accessories={
              isLoading
                ? [{ text: "Launching stream...", icon: Icon.Clock }]
                : [
                    {
                      text: camera.traits.online ? "Online" : "Offline",
                      icon: camera.traits.online ? Icon.Circle : Icon.CircleDisabled,
                    },
                    {
                      text: getStreamingText(camera.traits.streamingSupport),
                      icon: getStreamingIcon(camera.traits.streamingSupport),
                    },
                    ...(isQuickAccess ? [{ text: "Quick Access", icon: Icon.Star }] : []),
                  ]
            }
            actions={
              <ActionPanel>
                {onOpenStream && camera.traits.online && !isLoading && (
                  <Action
                    title="Open Stream"
                    icon={Icon.Video}
                    onAction={() => handleOpenStream(camera)}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                  />
                )}
                <Action.Push title="View Camera Details" target={<CameraView camera={camera} />} icon={Icon.Video} />
                <Action
                  title={isQuickAccess ? "Remove Quick Access" : "Set as Quick Access"}
                  icon={isQuickAccess ? Icon.StarDisabled : Icon.Star}
                  onAction={() => handleSetQuickAccess(camera)}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
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
      })}
      <List.EmptyView
        title="No cameras found"
        description="Make sure your Nest cameras are set up in the Google Home app."
        icon={Icon.Camera}
      />
    </List>
  );
}
