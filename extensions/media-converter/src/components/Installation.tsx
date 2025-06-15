import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage } from "@raycast/api";
import fs from "fs";
import { installFFmpegBinary } from "../utils/ffmpeg";
import { execPromise } from "../utils/exec";

interface InstallationProps {
  onInstallComplete: () => void;
  detectedFFmpegPath?: string | null;
  lostFFmpegMessage?: string | null;
}

export function Installation({ onInstallComplete, detectedFFmpegPath, lostFFmpegMessage }: InstallationProps) {
  const [customPath, setCustomPath] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);

  const handleDetectedPath = async () => {
    if (!detectedFFmpegPath) return;

    try {
      await LocalStorage.setItem("ffmpeg-path", detectedFFmpegPath);
      showToast({ style: Toast.Style.Success, title: "FFmpeg path saved" });
      onInstallComplete();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to save FFmpeg path", message: String(error) });
    }
  };

  const handleCustomPath = async () => {
    if (!customPath.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Please enter a valid path" });
      return;
    }

    // Validate the custom path exists and is executable
    const trimmedPath = customPath.trim();
    if (!fs.existsSync(trimmedPath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "FFmpeg not found",
        message: "The specified path does not exist",
      });
      return;
    }

    // Try to verify it's actually FFmpeg by running it
    try {
      const { stdout } = await execPromise(`"${trimmedPath}" -version`);
      if (!stdout.includes("ffmpeg version")) {
        showToast({
          style: Toast.Style.Failure,
          title: "Invalid FFmpeg binary",
          message: "The specified file is not a valid FFmpeg executable",
        });
        return;
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid FFmpeg binary",
        message: `Could not execute the specified file as FFmpeg: ${error}`,
      });
      return;
    }

    try {
      await LocalStorage.setItem("ffmpeg-path", customPath.trim());
      showToast({ style: Toast.Style.Success, title: "Custom FFmpeg path saved" });
      onInstallComplete();
    } catch (error) {
      showToast({ style: Toast.Style.Failure, title: "Failed to save custom path", message: String(error) });
    }
  };

  const handleAutoInstall = async () => {
    setIsInstalling(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing FFmpeg...",
      message: "0%",
    });

    try {
      await installFFmpegBinary((progress: number) => {
        // Update toast message with progress percentage
        toast.message = `${progress}%`;
      });

      await toast.hide();
      await showToast({ style: Toast.Style.Success, title: "FFmpeg installed successfully" });
      onInstallComplete();
    } catch (error) {
      await toast.hide();
      console.error("Auto-install error:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to install FFmpeg",
        message: `Error: ${String(error)}`,
      });
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {detectedFFmpegPath && (
            <Action
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Use Detected FFmpeg"
              onAction={handleDetectedPath}
              shortcut={{ modifiers: [], key: "return" }}
            />
          )}
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title={isInstalling ? "Installing..." : "Auto-Install FFmpeg"}
            onAction={handleAutoInstall}
            shortcut={{ modifiers: detectedFFmpegPath ? ["cmd"] : [], key: "return" }}
          />
          <Action
            title="Use Custom Path"
            onAction={handleCustomPath}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="FFmpeg is required to convert media files. Choose an installation option below:" />

      {lostFFmpegMessage && (
        <>
          <Form.Separator />
          <Form.Description text={`⚠️ ${lostFFmpegMessage}`} />
        </>
      )}

      {detectedFFmpegPath ? (
        <>
          <Form.Separator />
          <Form.Description text={`✅ FFmpeg detected at: ${detectedFFmpegPath}`} />
          <Form.Description text="Click 'Use Detected FFmpeg' to use this installation." />
        </>
      ) : (
        <>
          <Form.Separator />
          <Form.Description text="❌ FFmpeg not found in common system locations. This is expected for most users." />
        </>
      )}

      <Form.Separator />

      <Form.TextField
        id="customPath"
        title="Custom FFmpeg Path"
        placeholder="/path/to/your/ffmpeg"
        value={customPath}
        onChange={setCustomPath}
        info="If you have FFmpeg installed at a custom location, enter the full path here"
      />

      <Form.Separator />

      <Form.Description text="Or click 'Auto-Install FFmpeg' to download and install FFmpeg automatically." />
    </Form>
  );
}
