import { useState, useEffect } from "react";
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, environment } from "@raycast/api";
import fs from "fs";
import { checkFFmpegVersion, findFFmpegPath } from "../utils/ffmpeg";
import { execPromise } from "../utils/exec";
import { useFFmpegInstaller } from "../hooks/useFFmpegInstaller";

export function FFmpegInstallPage({
  onInstallComplete,
  lostFFmpegMessage,
}: {
  onInstallComplete: () => void;
  lostFFmpegMessage?: string | null;
}) {
  const [customPath, setCustomPath] = useState("");
  const [customPathError, setCustomPathError] = useState("");
  const [hasAutoDetectedFFmpeg, setHasAutoDetectedFFmpeg] = useState(false);
  const { isInstalling, installFFmpeg } = useFFmpegInstaller();

  // Check if FFmpeg is auto-detectable on component mount
  useEffect(() => {
    const checkAutoDetection = async () => {
      try {
        const ffmpegInfo = await findFFmpegPath();
        setHasAutoDetectedFFmpeg(!!ffmpegInfo);
      } catch (error) {
        console.warn("Error checking for auto-detected FFmpeg:", error);
        setHasAutoDetectedFFmpeg(false);
      }
    };
    checkAutoDetection();
  }, []);

  const handleAutoInstall = async () => {
    const installSuccess = await installFFmpeg();
    if (installSuccess) {
      onInstallComplete();
    }
  };

  const handleUseAutoDetected = async () => {
    try {
      // Find and use the auto-detected FFmpeg
      const ffmpegInfo = await findFFmpegPath();
      if (ffmpegInfo) {
        // Path is already stored by findFFmpegPath, so we just need to complete
        showToast({
          style: Toast.Style.Success,
          title: "FFmpeg found",
          message: `Using FFmpeg v${ffmpegInfo.version} at: ${ffmpegInfo.path}`,
        });
        onInstallComplete();
      } else {
        showToast({
          style: Toast.Style.Failure,
          title: "FFmpeg not found",
          message: "Auto-detected FFmpeg is no longer available",
        });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error configuring FFmpeg",
        message: String(error),
      });
    }
  };

  const getAutoDetectedButton = () => {
    return { title: "Use Auto-Detected FFmpeg", icon: Icon.Checkmark };
  };

  const getAutoInstallButton = () => {
    if (isInstalling) {
      return { title: "Installing...", icon: Icon.Download };
    }
    return { title: "Auto-Install FFmpeg", icon: Icon.Download };
  };

  const handleCustomPath = async () => {
    if (!customPath.trim()) {
      setCustomPathError("Please enter a valid path");
      return;
    }

    // Clear any previous error
    setCustomPathError("");

    // Validate the custom path exists and is executable
    const trimmedPath = customPath.trim();
    if (!fs.existsSync(trimmedPath)) {
      setCustomPathError("The specified path does not exist");
      return;
    }

    // Try to verify it's actually FFmpeg by running it
    try {
      const { stdout } = await execPromise(`"${trimmedPath}" -version`);
      if (!stdout.includes("ffmpeg version")) {
        setCustomPathError("The specified file is not a valid FFmpeg executable");
        return;
      }

      // Check version
      const version = await checkFFmpegVersion(trimmedPath);
      if (version && version < 6.0) {
        setCustomPathError(`FFmpeg v${version} found, but v6.0+ is required for this extension`);
        return;
      }
    } catch (error) {
      setCustomPathError(`Could not execute the specified file as FFmpeg: ${error}`);
      return;
    }

    try {
      await LocalStorage.setItem("ffmpeg-path", customPath.trim());
      showToast({
        style: Toast.Style.Success,
        title: "Custom FFmpeg path saved",
        message: "Successfully configured FFmpeg path",
      });
      onInstallComplete();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to save custom path", message: String(error) });
    }
  };

  return (
    <Form
      isLoading={isInstalling}
      actions={
        <ActionPanel>
          {customPath.trim() ? (
            // When custom path is entered, it takes priority regardless of auto-detection
            hasAutoDetectedFFmpeg ? (
              // Custom path + auto-detected: show all three options with custom path as primary
              <>
                <Action
                  title="Use Custom Path"
                  onAction={handleCustomPath}
                  icon={Icon.Folder}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action
                  title={getAutoDetectedButton().title}
                  onAction={handleUseAutoDetected}
                  icon={getAutoDetectedButton().icon}
                />
                <Action
                  title={getAutoInstallButton().title}
                  onAction={handleAutoInstall}
                  icon={getAutoInstallButton().icon}
                />
              </>
            ) : (
              // Custom path + no auto-detected: show custom path and auto-install
              <>
                <Action
                  title="Use Custom Path"
                  onAction={handleCustomPath}
                  icon={Icon.Folder}
                  shortcut={{ modifiers: [], key: "return" }}
                />
                <Action
                  title={getAutoInstallButton().title}
                  onAction={handleAutoInstall}
                  icon={getAutoInstallButton().icon}
                />
              </>
            )
          ) : hasAutoDetectedFFmpeg ? (
            // No custom path + auto-detected: show auto-detected as primary with auto-install option
            <>
              <Action
                title={getAutoDetectedButton().title}
                onAction={handleUseAutoDetected}
                icon={getAutoDetectedButton().icon}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action
                title={getAutoInstallButton().title}
                onAction={handleAutoInstall}
                icon={getAutoInstallButton().icon}
              />
              <Action title="Use Custom Path" onAction={handleCustomPath} icon={Icon.Folder} />
            </>
          ) : (
            // No custom path + no auto-detected: show auto-install as primary
            <>
              <Action
                title={getAutoInstallButton().title}
                onAction={handleAutoInstall}
                icon={getAutoInstallButton().icon}
                shortcut={{ modifiers: [], key: "return" }}
              />
              <Action title="Use Custom Path" onAction={handleCustomPath} icon={Icon.Folder} />
            </>
          )}
        </ActionPanel>
      }
    >
      {lostFFmpegMessage && (
        <>
          <Form.Description text={`⚠️ ${lostFFmpegMessage}`} />
          <Form.Separator />
        </>
      )}

      <Form.TextField
        id="customPath"
        title="FFmpeg Path"
        placeholder="/path/to/your/ffmpeg"
        value={customPath}
        onChange={(newValue) => {
          setCustomPath(newValue);
          // Clear error when user starts typing
          if (customPathError) {
            setCustomPathError("");
          }
        }}
        error={customPathError}
        info={`Enter the full path to your FFmpeg binary. To find the path, run \`${process.platform === "win32" ? "where ffmpeg" : "which ffmpeg"}\` in your terminal. Make sure your FFmpeg binary is version 6.0 or higher for full compatibility.`}
      />

      <Form.Separator />

      <Form.Description
        text={
          hasAutoDetectedFFmpeg
            ? `FFmpeg was found on your system! Click 'Use Auto-Detected FFmpeg' to use it, 'Auto-Install FFmpeg' to download a fresh copy to \`${environment.supportPath}\`, or enter a custom path above.`
            : `Click 'Auto-Install FFmpeg' to download and install FFmpeg automatically to \`${environment.supportPath}\`, or enter a custom path above.`
        }
      />
    </Form>
  );
}
