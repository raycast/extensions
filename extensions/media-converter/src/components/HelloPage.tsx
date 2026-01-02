import {
  Detail,
  Action,
  ActionPanel,
  Icon,
  showToast,
  Toast,
  showHUD,
  openCommandPreferences,
  getPreferenceValues,
} from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { findFFmpegPath, checkFFmpegVersion } from "../utils/ffmpeg";
import { useFFmpegInstaller } from "../hooks/useFFmpegInstaller";
import fs from "fs";
import { showFailureToast } from "@raycast/utils";

interface HelloPageProps {
  onContinue: () => void;
  lostFFmpegMessage?: string | null;
}

export function HelloPage({ onContinue, lostFFmpegMessage }: HelloPageProps) {
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [ffmpegStatus, setFFmpegStatus] = useState<{
    systemFound: boolean;
    customValid: boolean;
    customPath?: string;
    systemInfo?: { path: string; version: number };
  } | null>(null);
  const { isInstalling, installFFmpeg } = useFFmpegInstaller();

  // Check FFmpeg status on component mount
  useEffect(() => {
    const checkFFmpegStatus = async () => {
      try {
        const preferences = getPreferenceValues();
        const customPath = preferences.ffmpeg_path;

        // Check system FFmpeg
        const systemFFmpeg = await findFFmpegPath();

        // Check custom FFmpeg if specified
        let customValid = false;
        if (customPath && customPath.trim()) {
          if (fs.existsSync(customPath)) {
            const version = await checkFFmpegVersion(customPath);
            customValid = version !== null && version >= 6.0;
          }
        }

        setFFmpegStatus({
          systemFound: !!systemFFmpeg,
          customValid,
          customPath,
          systemInfo: systemFFmpeg || undefined,
        });
      } catch (error) {
        console.error("Error checking FFmpeg status:", error);
        setFFmpegStatus({
          systemFound: false,
          customValid: false,
        });
      }
    };

    checkFFmpegStatus();
  }, []);

  const handleContinueWithSystem = async () => {
    setIsSettingUp(true);

    try {
      // Use system FFmpeg
      const ffmpegInfo = await findFFmpegPath();
      if (ffmpegInfo) {
        await showToast({
          style: Toast.Style.Success,
          title: "FFmpeg found",
          message: `Using system FFmpeg v${ffmpegInfo.version} at: ${ffmpegInfo.path}`,
        });
        await LocalStorage.setItem("hasSeenHelloPage", "true");
        onContinue();
      } else {
        await showFailureToast({
          title: "System FFmpeg not found",
          message: "Could not find system FFmpeg. Please try download option.",
        });
      }
    } catch (error) {
      console.error("Error setting up system FFmpeg:", error);
      await showFailureToast({
        title: "Setup failed",
        message: "Could not setup system FFmpeg. Please try again.",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleContinueWithCustom = async () => {
    setIsSettingUp(true);

    try {
      const preferences = getPreferenceValues();
      const customPath = preferences.ffmpeg_path;

      if (!customPath || !customPath.trim()) {
        await showHUD("No custom FFmpeg path specified in preferences");
        await openCommandPreferences();
        return;
      }

      if (!fs.existsSync(customPath)) {
        await showHUD(
          "The specified FFmpeg path does not exist. Please check your preferences and ensure the file exists.",
        );
        await openCommandPreferences();
        return;
      }

      const version = await checkFFmpegVersion(customPath);
      if (!version || version < 6.0) {
        await showHUD(
          "The specified file is not a valid FFmpeg executable or is below version 6.0. Please check your preferences.",
        );
        await openCommandPreferences();
        return;
      }

      // Custom FFmpeg is valid, store it and continue
      await LocalStorage.setItem("ffmpeg-path", customPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Custom FFmpeg configured",
        message: `Using custom FFmpeg v${version} at: ${customPath}`,
      });
      await LocalStorage.setItem("hasSeenHelloPage", "true");
      onContinue();
    } catch (error) {
      console.error("Error setting up custom FFmpeg:", error);
      await showHUD("Error validating custom FFmpeg path. Please check your preferences.");
      await openCommandPreferences();
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleDownloadFFmpeg = async () => {
    setIsSettingUp(true);

    try {
      const installSuccess = await installFFmpeg();

      if (installSuccess) {
        await LocalStorage.setItem("hasSeenHelloPage", "true");
        onContinue();
      } else {
        await showFailureToast({
          title: "Installation failed",
          message: "Could not install FFmpeg automatically. Please try specifying a custom path.",
        });
      }
    } catch (error) {
      console.error("Error during FFmpeg installation:", error);
      await showFailureToast(String(error), {
        title: "Installation failed",
        message: "Could not install FFmpeg. Please try again or specify a custom path.",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSpecifyCustomPath = async () => {
    await LocalStorage.setItem("hasSeenHelloPage", "true");
    await openCommandPreferences();
    // Note: User will need to restart the command after setting preferences
  };

  // Determine primary action based on FFmpeg status
  const getPrimaryAction = () => {
    if (!ffmpegStatus) {
      return {
        title: "Loading...",
        onAction: () => {},
        icon: Icon.Clock,
      };
    }

    // For lost FFmpeg scenario, prioritize alternatives over the lost configuration
    if (lostFFmpegMessage) {
      // If there's a valid custom path that's different from the lost one, use it
      if (ffmpegStatus.customValid && ffmpegStatus.customPath) {
        return {
          title: "Continue (Use Custom FFmpeg)",
          onAction: handleContinueWithCustom,
          icon: Icon.Folder,
        };
      }

      // If system FFmpeg is found, prioritize it in lost scenario
      if (ffmpegStatus.systemFound) {
        return {
          title: "Continue (Use System FFmpeg)",
          onAction: handleContinueWithSystem,
          icon: Icon.Checkmark,
        };
      }

      // Otherwise default to download
      return {
        title: "Continue (Download FFmpeg)",
        onAction: handleDownloadFFmpeg,
        icon: Icon.Download,
      };
    }

    // Original logic for first-time setup
    if (ffmpegStatus.customValid && ffmpegStatus.customPath) {
      return {
        title: "Continue (Use Custom FFmpeg)",
        onAction: handleContinueWithCustom,
        icon: Icon.Folder,
      };
    }

    if (ffmpegStatus.systemFound) {
      return {
        title: "Continue (Use System FFmpeg)",
        onAction: handleContinueWithSystem,
        icon: Icon.Checkmark,
      };
    }

    return {
      title: "Continue (Download FFmpeg)",
      onAction: handleDownloadFFmpeg,
      icon: Icon.Download,
    };
  };

  const primaryAction = getPrimaryAction();
  const isLostFFmpegScenario = !!lostFFmpegMessage;

  return (
    <Detail
      isLoading={isSettingUp || isInstalling || !ffmpegStatus}
      markdown={
        isLostFFmpegScenario
          ? `
# ⚠️ FFmpeg Configuration Lost

${lostFFmpegMessage}

## What happened?
Your previously configured FFmpeg is no longer available. This can happen if:
- The FFmpeg binary was moved or deleted
- The downloaded FFmpeg was corrupted or removed
- System FFmpeg was uninstalled
- The custom path you specified is no longer valid

## Next Steps
Choose one of the options below to reconfigure FFmpeg and continue using the Media Converter:

${
  ffmpegStatus
    ? `
## Current FFmpeg Status:
- **System FFmpeg**: ${ffmpegStatus.systemFound ? `✅ Found v${ffmpegStatus.systemInfo?.version} at ${ffmpegStatus.systemInfo?.path}` : "❌ Not found"}
- **Custom FFmpeg**: ${ffmpegStatus.customValid ? `✅ Valid at ${ffmpegStatus.customPath}` : ffmpegStatus.customPath ? `❌ Invalid or missing at ${ffmpegStatus.customPath}` : "Not specified"}
`
    : ""
}

Don't worry - your conversion will work normally once FFmpeg is reconfigured!
      `
          : `
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

${
  ffmpegStatus
    ? `
## FFmpeg Status:
- **System FFmpeg**: ${ffmpegStatus.systemFound ? `✅ Found v${ffmpegStatus.systemInfo?.version} at ${ffmpegStatus.systemInfo?.path}` : "❌ Not found"}
- **Custom FFmpeg**: ${ffmpegStatus.customValid ? `✅ Valid at ${ffmpegStatus.customPath}` : ffmpegStatus.customPath ? `❌ Invalid or missing at ${ffmpegStatus.customPath}` : "Not specified"}
`
    : ""
}

To get started, choose your preferred FFmpeg option below:

Enjoy using the converter!
      `
      }
      actions={
        <ActionPanel>
          <Action
            title={primaryAction.title}
            icon={primaryAction.icon}
            onAction={primaryAction.onAction}
            shortcut={{ modifiers: [], key: "return" }}
          />

          {/* Show additional context for lost FFmpeg scenario */}
          {isLostFFmpegScenario && (
            // eslint-disable-next-line @raycast/prefer-title-case
            <Action title="Specify Custom FFmpeg Path" icon={Icon.Gear} onAction={handleSpecifyCustomPath} />
          )}

          {/* Always show all three options */}
          {ffmpegStatus?.systemFound && primaryAction.title !== "Continue (Use System FFmpeg)" && (
            // eslint-disable-next-line @raycast/prefer-title-case
            <Action title="Continue (Use System FFmpeg)" icon={Icon.Checkmark} onAction={handleContinueWithSystem} />
          )}

          {primaryAction.title !== "Continue (Download FFmpeg)" && (
            // eslint-disable-next-line @raycast/prefer-title-case
            <Action title="Continue (Download FFmpeg)" icon={Icon.Download} onAction={handleDownloadFFmpeg} />
          )}

          {!isLostFFmpegScenario && !ffmpegStatus?.customValid && !ffmpegStatus?.customPath && (
            // eslint-disable-next-line @raycast/prefer-title-case
            <Action title="Specify Custom FFmpeg Path" icon={Icon.Gear} onAction={handleSpecifyCustomPath} />
          )}
        </ActionPanel>
      }
    />
  );
}
