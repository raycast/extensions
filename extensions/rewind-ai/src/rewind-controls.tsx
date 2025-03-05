import { ActionPanel, Action, Icon, List, showHUD } from "@raycast/api";
import { useEffect, useState } from "react";
import { execSync } from "child_process";

interface RewindStatus {
  isScreenCaptureEnabled: boolean;
  isAudioCaptureEnabled: boolean;
}

export default function Command() {
  const [status, setStatus] = useState<RewindStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRewindStatus();
  }, []);

  const fetchRewindStatus = async () => {
    try {
      setIsLoading(true);

      // Get current screen capture status
      const screenCaptureOutput = execSync("defaults read com.memoryvault.MemoryVault recordOnLaunch")
        .toString()
        .trim();
      const isScreenCaptureEnabled = screenCaptureOutput === "1";

      // Get current audio capture status
      const audioCaptureOutput = execSync("defaults read com.memoryvault.MemoryVault recordAudioOnLaunch")
        .toString()
        .trim();
      const isAudioCaptureEnabled = audioCaptureOutput === "1";

      setStatus({
        isScreenCaptureEnabled,
        isAudioCaptureEnabled,
      });
    } catch (error) {
      console.error("Error fetching Rewind status:", error);
      await showHUD("Failed to get Rewind status");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleScreenCapture = async () => {
    try {
      if (!status) return;

      const newValue = status.isScreenCaptureEnabled ? "0" : "1";
      execSync(`defaults write com.memoryvault.MemoryVault recordOnLaunch -int ${newValue}`);

      // Restart Rewind to apply changes
      execSync("killall Rewind || true");
      execSync("open -a Rewind");

      // Update local state immediately before showing HUD
      setStatus((prevStatus) =>
        prevStatus ? { ...prevStatus, isScreenCaptureEnabled: !prevStatus.isScreenCaptureEnabled } : null,
      );

      await showHUD(`Screen Capture ${status.isScreenCaptureEnabled ? "Disabled" : "Enabled"}`);
    } catch (error) {
      console.error("Error toggling screen capture:", error);
      await showHUD("Failed to toggle screen capture");
    }
  };

  const toggleAudioCapture = async () => {
    try {
      if (!status) return;

      const newValue = status.isAudioCaptureEnabled ? "0" : "1";
      execSync(`defaults write com.memoryvault.MemoryVault recordAudioOnLaunch -int ${newValue}`);

      // Restart Rewind to apply changes
      execSync("killall Rewind || true");
      execSync("open -a Rewind");

      // Update local state immediately before showing HUD
      setStatus((prevStatus) =>
        prevStatus ? { ...prevStatus, isAudioCaptureEnabled: !prevStatus.isAudioCaptureEnabled } : null,
      );

      await showHUD(`Audio Capture ${status.isAudioCaptureEnabled ? "Disabled" : "Enabled"}`);
    } catch (error) {
      console.error("Error toggling audio capture:", error);
      await showHUD("Failed to toggle audio capture");
    }
  };

  const openRewindApp = async () => {
    try {
      execSync(`open -a Rewind`);
      await showHUD("Rewind opened");
    } catch (error) {
      console.error("Error opening Rewind:", error);
      await showHUD("Failed to open Rewind");
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.Section title="Recording Controls">
        <List.Item
          icon={status?.isScreenCaptureEnabled ? Icon.Eye : Icon.EyeDisabled}
          title="Screen Capture"
          subtitle={status?.isScreenCaptureEnabled ? "Currently Enabled" : "Currently Disabled"}
          accessories={[{ icon: status?.isScreenCaptureEnabled ? Icon.CheckCircle : Icon.Circle }]}
          actions={
            <ActionPanel>
              <Action title="Toggle Screen Capture" onAction={toggleScreenCapture} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={status?.isAudioCaptureEnabled ? Icon.Microphone : Icon.MicrophoneDisabled}
          title="Audio Capture"
          subtitle={status?.isAudioCaptureEnabled ? "Currently Enabled" : "Currently Disabled"}
          accessories={[{ icon: status?.isAudioCaptureEnabled ? Icon.CheckCircle : Icon.Circle }]}
          actions={
            <ActionPanel>
              <Action title="Toggle Audio Capture" onAction={toggleAudioCapture} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Application">
        <List.Item
          icon={Icon.AppWindow}
          title="Open Rewind"
          subtitle="Opens the Rewind application"
          actions={
            <ActionPanel>
              <Action title="Open" onAction={openRewindApp} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
