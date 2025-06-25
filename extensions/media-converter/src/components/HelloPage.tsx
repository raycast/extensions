import { Detail, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { useState } from "react";
import { findFFmpegPath } from "../utils/ffmpeg";
import { useFFmpegInstaller } from "../hooks/useFFmpegInstaller";

interface HelloPageProps {
  onContinue: () => void;
  onChooseToSetCustomFFmpegPath: () => void;
}

export function HelloPage({ onContinue, onChooseToSetCustomFFmpegPath }: HelloPageProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const { isInstalling, installFFmpeg } = useFFmpegInstaller();

  const handleContinue = async () => {
    setIsSettingUp(true);

    try {
      // Check if valid FFmpeg (v6.0+) is available
      const ffmpegInfo = await findFFmpegPath();

      if (ffmpegInfo) {
        // FFmpeg found and is v6.0+ - show toast and continue
        await showToast({
          style: Toast.Style.Success,
          title: "FFmpeg found",
          message: `FFmpeg v${ffmpegInfo.version} detected at: ${ffmpegInfo.path}`,
        });
        await LocalStorage.setItem("hasSeenHelloPage", "true");
        onContinue();
      } else {
        // No valid FFmpeg found, auto-install
        const installSuccess = await installFFmpeg();

        if (installSuccess) {
          await LocalStorage.setItem("hasSeenHelloPage", "true");
          onContinue();
        } else {
          await showToast({
            style: Toast.Style.Failure,
            title: "Installation failed",
            message: "Could not install FFmpeg automatically. Please use custom path option.",
          });
        }
      }
    } catch (error) {
      console.error("Error during setup:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Setup failed",
        message: "Could not complete setup. Please try again.",
      });
    } finally {
      setIsSettingUp(false);
    }
  };
  return (
    <Detail
      isLoading={isSettingUp || isInstalling}
      markdown={`
# Welcome to Media Converter!

This extension allows you to easily convert between different media formats using FFmpeg.

## Features:
- Simple one-click conversion
- Support for multiple files at once
- Automatic FFmpeg installation if not present
- Preserves original file quality
- For a list of supported formats, see the [README](https://github.com/raycast/extensions/blob/main/extensions/media-converter/README.md#supported-formats).

## How to use:
1. Select one or more files of the same type (video, image, or audio)
2. Choose your desired output format (and quality if applicable)
3. Click Convert or press ⌘↵

To get started, click the Continue button below or press ⏎.

Enjoy using the converter!
      `}
      actions={
        <ActionPanel>
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title={isSettingUp || isInstalling ? "Setting up..." : "Continue"}
            icon={Icon.Checkmark}
            onAction={handleContinue}
            shortcut={{ modifiers: [], key: "return" }}
          />
          <Action
            // eslint-disable-next-line @raycast/prefer-title-case
            title="Specify Local FFmpeg Path (Advanced)"
            icon={Icon.Gear}
            onAction={async () => {
              await LocalStorage.setItem("hasSeenHelloPage", "true");
              onChooseToSetCustomFFmpegPath();
            }}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
        </ActionPanel>
      }
    />
  );
}
