import {
  ActionPanel,
  Action,
  Icon,
  List,
  showToast,
  Toast,
  confirmAlert,
  getPreferenceValues,
  Alert,
} from '@raycast/api';
import { useEffect, useState } from 'react';
import {
  getStatus,
  toggleMute,
  toggleVideo,
  leaveMeeting,
  isMuteDeckRunning,
  isInMeeting,
  isMuted,
  isVideoOn,
  isPresenting,
  isRecording,
  type MuteDeckStatus,
} from './utils/api';

export default function Command(): JSX.Element {
  const { showToasts, confirmMuteInPresentation, confirmVideoInPresentation, confirmLeave } =
    getPreferenceValues<{
      showToasts: boolean;
      confirmMuteInPresentation: boolean;
      confirmVideoInPresentation: boolean;
      confirmLeave: boolean;
    }>();

  const [state, setState] = useState<{
    items?: MuteDeckStatus;
    error?: Error;
  }>({});

  useEffect(() => {
    async function fetchStatus() {
      try {
        const status = await getStatus();
        setState({ items: status });
      } catch (error) {
        setState({ error: error instanceof Error ? error : new Error(String(error)) });
      }
    }

    void fetchStatus();
  }, []);

  async function handleToggleMute(): Promise<void> {
    if (state.items && isPresenting(state.items) && confirmMuteInPresentation) {
      const proceed = await confirmAlert({
        title: 'Toggle Microphone While Presenting',
        message: 'Are you sure you want to toggle your microphone while presenting?',
        primaryAction: {
          title: 'Toggle Microphone',
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!proceed) {
        return;
      }
    }

    try {
      await toggleMute();
      if (showToasts) {
        await showToast({
          style: Toast.Style.Success,
          title: 'Toggled microphone',
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to toggle microphone',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleToggleVideo(): Promise<void> {
    if (state.items && isPresenting(state.items) && confirmVideoInPresentation) {
      const proceed = await confirmAlert({
        title: 'Toggle Camera While Presenting',
        message: 'Are you sure you want to toggle your camera while presenting?',
        primaryAction: {
          title: 'Toggle Camera',
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!proceed) {
        return;
      }
    }

    try {
      await toggleVideo();
      if (showToasts) {
        await showToast({
          style: Toast.Style.Success,
          title: 'Toggled camera',
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to toggle camera',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function handleLeaveMeeting(): Promise<void> {
    if (confirmLeave) {
      const proceed = await confirmAlert({
        title: 'Leave Meeting',
        message: 'Are you sure you want to leave the current meeting?',
        primaryAction: {
          title: 'Leave Meeting',
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!proceed) {
        return;
      }
    }

    try {
      await leaveMeeting();
      if (showToasts) {
        await showToast({
          style: Toast.Style.Success,
          title: 'Left meeting',
        });
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: 'Failed to leave meeting',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (state.error) {
    void showToast({
      style: Toast.Style.Failure,
      title: 'Failed to get MuteDeck status',
      message: state.error.message,
    });

    return (
      <List>
        <List.EmptyView
          icon={{ source: 'exclamationmark.triangle' }}
          title="Failed to get MuteDeck status"
          description={state.error.message}
        />
      </List>
    );
  }

  const status = state.items;
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
    <List>
      <List.Item
        icon={isRunning ? Icon.CheckCircle : Icon.Circle}
        title="MuteDeck Status"
        subtitle={isRunning ? 'Running' : 'Not Running'}
        accessories={[{ text: inMeeting ? 'In Meeting' : 'Not in Meeting' }]}
      />
      <List.Item
        icon={muted ? Icon.MicrophoneDisabled : Icon.Microphone}
        title="Microphone"
        subtitle={muted ? 'Muted' : 'Unmuted'}
        actions={
          <ActionPanel>
            <Action
              icon={muted ? Icon.Microphone : Icon.MicrophoneDisabled}
              title={muted ? 'Unmute' : 'Mute'}
              onAction={handleToggleMute}
              shortcut={{ modifiers: ['cmd'], key: 'm' }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={videoEnabled ? Icon.Video : Icon.VideoDisabled}
        title="Camera"
        subtitle={videoEnabled ? 'On' : 'Off'}
        actions={
          <ActionPanel>
            <Action
              icon={videoEnabled ? Icon.VideoDisabled : Icon.Video}
              title={videoEnabled ? 'Turn off Camera' : 'Turn on Camera'}
              onAction={handleToggleVideo}
              shortcut={{ modifiers: ['cmd'], key: 'v' }}
            />
          </ActionPanel>
        }
      />
      <List.Item
        icon={presenting ? Icon.Desktop : Icon.Window}
        title="Screen Sharing"
        subtitle={presenting ? 'Presenting' : 'Not Presenting'}
      />
      <List.Item
        icon={recording ? Icon.Dot : Icon.Circle}
        title="Recording"
        subtitle={recording ? 'Recording' : 'Not Recording'}
      />
      {inMeeting && (
        <List.Item
          icon={Icon.ArrowRight}
          title="Leave Meeting"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.ArrowRight}
                title="Leave Meeting"
                style={Action.Style.Destructive}
                onAction={handleLeaveMeeting}
                shortcut={{ modifiers: ['cmd'], key: 'l' }}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
