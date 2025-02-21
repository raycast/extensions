import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { NestCamera } from "../types";
import { NestDeviceService } from "../services/camera/NestDeviceService";

interface CameraViewProps {
  camera: NestCamera;
}

export function CameraView({ camera }: CameraViewProps): JSX.Element {
  const handleStreamOpen = async (pipMode: boolean = false) => {
    try {
      const deviceService = NestDeviceService.getInstance();
      await deviceService.openCameraStream(camera.id, { pipMode });
    } catch (error) {
      console.error('Failed to open stream:', error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Open Stream",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  };

  const getStreamingStatus = () => {
    if (!camera.traits.online) {
      return "🔴 Offline";
    }
    if (camera.traits.streamingSupport === "WEB_RTC") {
      return "✅ WebRTC Ready";
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
    if (camera.traits.streamingSupport === "WEB_RTC") {
      return "Click the actions below to start streaming in Safari with WebRTC.";
    }
    if (camera.traits.streamingSupport === "RTSP") {
      return "Click the actions below to start streaming in Safari with RTSP.";
    }
    return "This camera does not support streaming. Please check your camera model and settings.";
  };

  return (
    <Detail
      markdown={`
# ${camera.name}
${camera.roomHint ? `**Location**: ${camera.roomHint}` : ''}
**Status**: ${camera.traits.online ? "🟢 Online" : "🔴 Offline"}
**Streaming**: ${getStreamingStatus()}

${getStreamingInstructions()}
      `}
      actions={
        <ActionPanel>
          {camera.traits.online && (camera.traits.streamingSupport === "WEB_RTC" || camera.traits.streamingSupport === "RTSP") && (
            <>
              <Action
                title="Start Stream"
                onAction={() => handleStreamOpen(false)}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
              />
              <Action
                title="Start Stream PiP"
                onAction={() => handleStreamOpen(true)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
              />
            </>
          )}
          <Action.OpenInBrowser
            title="Open in Google Home"
            url={`https://home.google.com/cameras`}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
} 