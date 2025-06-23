import { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, LocalStorage, Icon, environment } from "@raycast/api";
import fs from "fs";
import { checkFFmpegVersion } from "../utils/ffmpeg";
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
  const { isInstalling, installFFmpeg } = useFFmpegInstaller();

  const handleAutoInstall = async () => {
    const installSuccess = await installFFmpeg();
    if (installSuccess) {
      onInstallComplete();
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

      // Check version
      const version = await checkFFmpegVersion(trimmedPath);
      if (version && version < 6.0) {
        showToast({
          style: Toast.Style.Failure,
          title: "FFmpeg version too old",
          message: `FFmpeg v${version} found, but v6.0+ is required for this extension`,
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
            <>
              <Action
                title="Use Custom Path"
                onAction={handleCustomPath}
                icon={Icon.Folder}
                shortcut={{ modifiers: [], key: "return" }}
              />
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
        onChange={setCustomPath}
        info={`Enter the full path to your FFmpeg binary. To find the path, run \`${process.platform === "win32" ? "where ffmpeg" : "which ffmpeg"}\` in your terminal. Make sure your FFmpeg binary is version 6.0 or higher for full compatibility.`}
      />

      <Form.Separator />

      <Form.Description
        text={`Or click 'Auto-Install FFmpeg' to download and install FFmpeg automatically. It will be located at \`${environment.supportPath}\``}
      />
    </Form>
  );
}
