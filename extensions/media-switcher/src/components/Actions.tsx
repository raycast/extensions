import { Action, Icon, showToast, Toast, Keyboard, Clipboard } from "@raycast/api";
import {
  switch_session,
  pause_session,
  play_session,
  previous_track,
  next_track,
  reveal_application,
  volume_up,
  volume_down,
} from "rust:../../rust";

async function handleTrackAction(label: string, action: () => Promise<void>, revalidate: () => void) {
  try {
    await action();
    revalidate();
  } catch (error) {
    await showToast({ style: Toast.Style.Failure, title: `Failed: ${label}`, message: String(error) });
  }
}

async function handlePause(appId: string, sessionIndex: number, titlePrefix: string, revalidate: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Pausing media session..." });
  try {
    await pause_session(appId, sessionIndex, titlePrefix);
    toast.style = Toast.Style.Success;
    toast.title = "Session paused";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to pause session";
    toast.message = String(error);
  }
}

async function handlePlay(appId: string, sessionIndex: number, titlePrefix: string, revalidate: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Playing media session..." });
  try {
    await play_session(appId, sessionIndex, titlePrefix);
    toast.style = Toast.Style.Success;
    toast.title = "Session playing";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to play session";
    toast.message = String(error);
  }
}

async function handleSwitch(appId: string, sessionIndex: number, titlePrefix: string, revalidate: () => void) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Switching media session..." });
  try {
    await switch_session(appId, sessionIndex, titlePrefix);
    toast.style = Toast.Style.Success;
    toast.title = "Switched media session";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to switch session";
    toast.message = String(error);
  }
}

interface SessionProps {
  appId: string;
  sessionIndex: number;
  titlePrefix: string;
  revalidate: () => void;
}

interface VolumeProps {
  volStep: number;
}

interface TrackInfoProps {
  title: string;
  artist: string;
}

export function ActionPause({ appId, sessionIndex, titlePrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Pause"
      icon={Icon.Pause}
      onAction={() => handlePause(appId, sessionIndex, titlePrefix, revalidate)}
    />
  );
}

export function ActionPlay({ appId, sessionIndex, titlePrefix, revalidate }: SessionProps) {
  return (
    <Action title="Play" icon={Icon.Play} onAction={() => handlePlay(appId, sessionIndex, titlePrefix, revalidate)} />
  );
}

export function ActionSwitch({ appId, sessionIndex, titlePrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Switch to This Session"
      icon={Icon.Switch}
      onAction={() => handleSwitch(appId, sessionIndex, titlePrefix, revalidate)}
    />
  );
}

export function ActionReveal({ appId }: { appId: string }) {
  return (
    <Action
      title="Reveal Application"
      icon={Icon.AppWindow}
      shortcut={{
        macOS: { modifiers: ["shift"], key: "return" },
        Windows: { modifiers: ["shift"], key: "enter" },
      }}
      onAction={() => reveal_application(appId)}
    />
  );
}

export function ActionPreviousTrack({ appId, sessionIndex, titlePrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Previous Track"
      icon={Icon.Rewind}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "[" },
        Windows: { modifiers: ["ctrl"], key: "[" },
      }}
      onAction={() =>
        handleTrackAction("Previous track", () => previous_track(appId, sessionIndex, titlePrefix), revalidate)
      }
    />
  );
}

export function ActionNextTrack({ appId, sessionIndex, titlePrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Next Track"
      icon={Icon.Forward}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "]" },
        Windows: { modifiers: ["ctrl"], key: "]" },
      }}
      onAction={() => handleTrackAction("Next track", () => next_track(appId, sessionIndex, titlePrefix), revalidate)}
    />
  );
}

export function ActionVolumeUp({ volStep }: VolumeProps) {
  return (
    <Action
      // eslint-disable-next-line @raycast/prefer-title-case
      title="Turn Volume Up"
      icon={Icon.SpeakerUp}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "=" },
        Windows: { modifiers: ["ctrl"], key: "=" },
      }}
      onAction={async () => {
        const level = await volume_up(volStep);
        await showToast({ style: Toast.Style.Success, title: `Volume set to ${level}%` });
      }}
    />
  );
}

export function ActionVolumeDown({ volStep }: VolumeProps) {
  return (
    <Action
      title="Turn Volume Down"
      icon={Icon.SpeakerDown}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "-" },
        Windows: { modifiers: ["ctrl"], key: "-" },
      }}
      onAction={async () => {
        const level = await volume_down(volStep);
        await showToast({ style: Toast.Style.Success, title: `Volume set to ${level}%` });
      }}
    />
  );
}

export function ActionCopyTrackInfo({ title, artist }: TrackInfoProps) {
  return (
    <Action
      title="Copy Track Info"
      icon={Icon.Clipboard}
      shortcut={Keyboard.Shortcut.Common.Copy}
      onAction={async () => {
        const text = artist ? `${title} — ${artist}` : title;
        await Clipboard.copy(text);
        await showToast({ style: Toast.Style.Success, title: "Copied to clipboard", message: text });
      }}
    />
  );
}

export function ActionRefresh({ revalidate }: { revalidate: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.RotateClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );
}
