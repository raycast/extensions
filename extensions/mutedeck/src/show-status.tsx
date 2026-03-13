import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getPreferences,
  getStatus,
  isInMeeting,
  isMuted,
  isMuteDeckRunning,
  isPresenting,
  isRecording,
  isVideoOn,
  type MuteDeckStatus,
} from "./utils/api";

interface State {
  status: MuteDeckStatus | null;
  isLoading: boolean;
  error: Error | null;
}

export default function Command(): JSX.Element {
  const [state, setState] = useState<State>({
    status: null,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    void fetchStatus();

    // Set up polling interval
    const { statusRefreshInterval } = getPreferences();
    const interval = setInterval(fetchStatus, parseInt(statusRefreshInterval, 10) * 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, []);

  async function fetchStatus(): Promise<void> {
    try {
      const status = await getStatus();
      setState((prev) => ({ ...prev, status, isLoading: false }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: new Error(error instanceof Error ? error.message : "Failed to fetch status"),
        isLoading: false,
      }));
    }
  }

  if (state.error) {
    void showToast({
      style: Toast.Style.Failure,
      title: "Failed to Get Status",
      message: state.error.message,
    });

    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to Get Status" description={state.error.message} />
      </List>
    );
  }

  const status = state.status;
  if (!status) {
    return <List isLoading />;
  }

  const isRunning = isMuteDeckRunning(status);
  const inMeeting = isInMeeting(status);
  const muted = isMuted(status);
  const videoEnabled = isVideoOn(status);
  const presenting = isPresenting(status);
  const recording = isRecording(status);

  return (
    <List isLoading={state.isLoading}>
      <List.Item
        icon={isRunning ? Icon.CheckCircle : Icon.XMarkCircle}
        title="MuteDeck Status"
        accessories={[{ text: isRunning ? "Running" : "Not Running" }]}
        actions={
          <ActionPanel>
            <Action title="Refresh Status" onAction={fetchStatus} />
          </ActionPanel>
        }
      />

      <List.Item
        icon={inMeeting ? Icon.Circle : Icon.XMarkCircle}
        title="Meeting Status"
        accessories={[{ text: inMeeting ? "In Meeting" : "Not in Meeting" }]}
      />

      {inMeeting && (
        <>
          <List.Item
            icon={muted ? Icon.SpeakerOff : Icon.Speaker}
            title="Microphone"
            accessories={[{ text: muted ? "Muted" : "Unmuted" }]}
          />

          <List.Item
            icon={videoEnabled ? Icon.Video : Icon.VideoDisabled}
            title="Camera"
            accessories={[{ text: videoEnabled ? "On" : "Off" }]}
          />

          <List.Item
            icon={presenting ? Icon.Desktop : Icon.Window}
            title="Screen Sharing"
            accessories={[{ text: presenting ? "Presenting" : "Not Presenting" }]}
          />

          <List.Item
            icon={recording ? Icon.Dot : Icon.Circle}
            title="Recording"
            accessories={[{ text: recording ? "Recording" : "Not Recording" }]}
          />
        </>
      )}
    </List>
  );
}
