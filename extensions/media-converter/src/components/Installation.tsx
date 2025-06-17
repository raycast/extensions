import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, Detail } from "@raycast/api";
import fs from "fs";
import { installFFmpegBinary } from "../utils/ffmpeg";
import { execPromise } from "../utils/exec";

interface InstallationProps {
  onInstallComplete: () => void;
  lostFFmpegMessage?: string | null;
}

export function Installation({ onInstallComplete, lostFFmpegMessage }: InstallationProps) {
  const [customPath, setCustomPath] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);

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
    <>
      {/* TODO: Detail doesn't render at all?? */}
      <Detail
        markdown={`
      # TEST MARKDOWN
            `}
      />
      <Form
        isLoading={isInstalling}
        actions={
          <ActionPanel>
            {customPath.trim() ? (
              <>
                <Action title="Use Custom Path" onAction={handleCustomPath} icon={Icon.Folder} />
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={isInstalling ? "Installing..." : "Auto-Install FFmpeg"}
                  onAction={handleAutoInstall}
                  icon={Icon.Download}
                />
              </>
            ) : (
              <>
                <Action
                  // eslint-disable-next-line @raycast/prefer-title-case
                  title={isInstalling ? "Installing..." : "Auto-Install FFmpeg"}
                  onAction={handleAutoInstall}
                  icon={Icon.Download}
                />
                <Action title="Use Custom Path" onAction={handleCustomPath} icon={Icon.Folder} />
              </>
            )}
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

        {/* <Form.Separator />

      <Form.Description text="We searched at common system locations for FFmpeg and didn't find it. Don't worry, this is expected for most users." /> */}

        <Form.Separator />

        <Form.TextField
          id="customPath"
          title="Custom FFmpeg Path"
          placeholder="/path/to/your/ffmpeg"
          value={customPath}
          onChange={setCustomPath}
          info={`If you have FFmpeg installed at a custom location, enter the full path here. To find the path, run \`${process.platform === "win32" ? "where ffmpeg" : "which ffmpeg"}\` in your terminal.`}
        />

        <Form.Separator />

        <Form.Description text="Or click 'Auto-Install FFmpeg' to download and install FFmpeg automatically." />
      </Form>
    </>
  );
}
