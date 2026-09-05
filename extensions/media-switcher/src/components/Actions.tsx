import { Action, Icon, showToast, Toast, Keyboard, getPreferenceValues, Color } from "@raycast/api";
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

async function handlePause(
  appId: string,
  sessionIndex: number,
  titlePrefix: string,
  artistPrefix: string,
  revalidate: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Pausing media session..." });
  try {
    await pause_session(appId, sessionIndex, titlePrefix, artistPrefix);
    toast.style = Toast.Style.Success;
    toast.title = "Session paused";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to pause session";
    toast.message = String(error);
  }
}

async function handlePlay(
  appId: string,
  sessionIndex: number,
  titlePrefix: string,
  artistPrefix: string,
  revalidate: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Playing media session..." });
  try {
    await play_session(appId, sessionIndex, titlePrefix, artistPrefix);
    toast.style = Toast.Style.Success;
    toast.title = "Session playing";
    revalidate();
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to play session";
    toast.message = String(error);
  }
}

async function handleSwitch(
  appId: string,
  sessionIndex: number,
  titlePrefix: string,
  artistPrefix: string,
  revalidate: () => void,
) {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Switching media session..." });
  try {
    await switch_session(appId, sessionIndex, titlePrefix, artistPrefix);
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
  artistPrefix: string;
  revalidate: () => void;
}

interface VolumeProps {
  volStep: number;
}

interface TrackInfoProps {
  title: string;
  artist: string;
}

export function PauseAction({ appId, sessionIndex, titlePrefix, artistPrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Pause"
      icon={Icon.Pause}
      onAction={() => handlePause(appId, sessionIndex, titlePrefix, artistPrefix, revalidate)}
    />
  );
}

export function PlayAction({ appId, sessionIndex, titlePrefix, artistPrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Play"
      icon={Icon.Play}
      onAction={() => handlePlay(appId, sessionIndex, titlePrefix, artistPrefix, revalidate)}
    />
  );
}

export function SwitchAction({ appId, sessionIndex, titlePrefix, artistPrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Switch to This Session"
      icon={Icon.Switch}
      onAction={() => handleSwitch(appId, sessionIndex, titlePrefix, artistPrefix, revalidate)}
    />
  );
}

export function RevealApplicationAction({
  appId,
  exePath,
  iconPath,
}: {
  appId: string;
  exePath: string;
  iconPath: string;
}) {
  return (
    <Action
      title="Reveal Application"
      icon={
        iconPath
          ? { source: `file:///${iconPath}` }
          : exePath
            ? { fileIcon: exePath, tintColor: Color.Red }
            : Icon.AppWindow
      }
      shortcut={{
        macOS: { modifiers: ["shift"], key: "return" },
        Windows: { modifiers: ["shift"], key: "enter" },
      }}
      onAction={() => reveal_application(appId)}
    />
  );
}

const preferences = getPreferenceValues();
const prevNextTrackShortcuts = preferences.prevNextTrackShortcuts;

const prevTrackShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: prevNextTrackShortcuts === "squareBrackets" ? "[" : "arrowLeft" },
  Windows: { modifiers: ["ctrl"], key: prevNextTrackShortcuts === "squareBrackets" ? "[" : "arrowLeft" },
};

const nextTrackShortcut: Keyboard.Shortcut = {
  macOS: { modifiers: ["cmd"], key: prevNextTrackShortcuts === "squareBrackets" ? "]" : "arrowRight" },
  Windows: { modifiers: ["ctrl"], key: prevNextTrackShortcuts === "squareBrackets" ? "]" : "arrowRight" },
};

export function PreviousTrackAction({ appId, sessionIndex, titlePrefix, artistPrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Previous Track"
      icon={Icon.Rewind}
      shortcut={prevTrackShortcut}
      onAction={() =>
        handleTrackAction(
          "Previous track",
          () => previous_track(appId, sessionIndex, titlePrefix, artistPrefix),
          revalidate,
        )
      }
    />
  );
}

export function NextTrackAction({ appId, sessionIndex, titlePrefix, artistPrefix, revalidate }: SessionProps) {
  return (
    <Action
      title="Next Track"
      icon={Icon.Forward}
      shortcut={nextTrackShortcut}
      onAction={() =>
        handleTrackAction("Next track", () => next_track(appId, sessionIndex, titlePrefix, artistPrefix), revalidate)
      }
    />
  );
}

export function VolumeUpAction({ volStep }: VolumeProps) {
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

export function VolumeDownAction({ volStep }: VolumeProps) {
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

export function CopyTrackInfoAction({ title, artist }: TrackInfoProps) {
  return (
    <Action.CopyToClipboard
      title="Copy Track Info"
      content={artist ? `${title} — ${artist}` : title}
      shortcut={Keyboard.Shortcut.Common.Copy}
    />
  );
}

export function RefreshAction<T>({ revalidate }: { revalidate: () => Promise<T> | void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={revalidate}
    />
  );
}
