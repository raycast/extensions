import { Action, ActionPanel, Detail, Icon, LaunchType, launchCommand } from "@raycast/api";
import type { UsePromiseReturnType } from "@raycast/utils/dist/types";
import { type PlayerStatus, usePlayerStatus } from "./hooks/usePlayerStatus";
import { PlaybackState, PlayerMode } from "./api/player";
import { COVER_NOT_FOUND } from "./lib/coverNotFound";
import { PlayerDetails } from "./components/PlayerDetails";

enum PlayerCommand {
  Reboot = "reboot",
  SetHighVolume = "setHighVolume",
  SetMinimalVolume = "setMinimalVolume",
  SetNormalVolume = "setNormalVolume",
  Stop = "stop",
  ToggleMute = "toggleMute",
  TogglePlayPause = "togglePlayPause",
  VolumeDown = "volumeDown",
  VolumeUp = "volumeUp",
}

const PlayerPlaybackStatus: Record<PlaybackState, string> = {
  [PlaybackState.Load]: "loading",
  [PlaybackState.None]: "stopped",
  [PlaybackState.Pause]: "paused",
  [PlaybackState.Play]: "playing",
  [PlaybackState.Stop]: "stopped",
};

const PlayerModeName: Record<PlayerMode, string> = {
  [PlayerMode.Radio]: "radio",
  [PlayerMode.Spotify]: "Spotify",
};

const PlayerCommandActions: Record<keyof typeof PlayerCommand, () => Promise<void>> = Object.keys(PlayerCommand).reduce(
  (commands, command) => ({
    ...commands,
    [command]: async () =>
      await launchCommand({
        name: PlayerCommand[command as keyof typeof PlayerCommand],
        type: LaunchType.UserInitiated,
      }),
  }),
  {} as Record<keyof typeof PlayerCommand, () => Promise<void>>,
);

export default function Command() {
  const playerStatus = usePlayerStatus();

  const isPlayerAvailable = !playerStatus.isLoading && !playerStatus.error;
  const isMuted = playerStatus?.data?.muted === true;

  return (
    <Detail
      markdown={getDetails(playerStatus)}
      isLoading={playerStatus.isLoading}
      metadata={<PlayerDetails playerStatus={playerStatus} />}
      actions={
        isPlayerAvailable ? (
          <ActionPanel>
            {!playerStatus.data!.isStopped && (
              <Action
                title={playerStatus.data!.isPlaying ? "Pause" : "Play"}
                icon={playerStatus.data!.isPlaying ? Icon.Pause : Icon.Play}
                onAction={PlayerCommandActions.TogglePlayPause}
              />
            )}
            <Action title="Stop" icon={Icon.Stop} onAction={PlayerCommandActions.Stop} />
            <ActionPanel.Section>
              <Action
                title="Volume Down"
                icon={Icon.SpeakerDown}
                onAction={PlayerCommandActions.VolumeDown}
                shortcut={{ modifiers: ["opt"], key: "arrowDown" }}
              />
              <Action
                title="Volume up"
                icon={Icon.SpeakerUp}
                onAction={PlayerCommandActions.VolumeUp}
                shortcut={{ modifiers: ["opt"], key: "arrowUp" }}
              />
              <Action
                title={isMuted ? "Unmute" : "Mute"}
                icon={isMuted ? Icon.SpeakerOn : Icon.SpeakerOff}
                onAction={PlayerCommandActions.ToggleMute}
                shortcut={{ modifiers: ["opt"], key: "m" }}
              />
              <Action
                title="Set Minimal Volume"
                icon={Icon.SpeakerLow}
                onAction={PlayerCommandActions.SetMinimalVolume}
                shortcut={{ modifiers: ["opt"], key: "l" }}
              />
              <Action
                title="Set Normal Volume"
                icon={Icon.SpeakerOn}
                onAction={PlayerCommandActions.SetNormalVolume}
                shortcut={{ modifiers: ["opt"], key: "n" }}
              />
              <Action
                title="Set High Volume"
                icon={Icon.SpeakerHigh}
                onAction={PlayerCommandActions.SetHighVolume}
                shortcut={{ modifiers: ["opt"], key: "h" }}
              />
            </ActionPanel.Section>
            <ActionPanel.Section>
              <Action
                title="Reboot"
                style={Action.Style.Destructive}
                icon={Icon.ArrowClockwise}
                onAction={PlayerCommandActions.Reboot}
                shortcut={{
                  macOS: { modifiers: ["cmd", "shift"], key: "r" },
                  Windows: { modifiers: ["ctrl", "shift"], key: "r" },
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        ) : null
      }
    ></Detail>
  );
}

function getDetails(playerStatus: UsePromiseReturnType<PlayerStatus>): string {
  return playerStatus.isLoading
    ? "Loading device status…"
    : playerStatus.error
      ? `## ${playerStatus.error.message}!`
      : `
${getHeader(playerStatus)}

${getCoverArt(playerStatus)}
`;
}

function getHeader(playerStatus: UsePromiseReturnType<PlayerStatus>): string {
  if (playerStatus.isLoading || playerStatus.error) {
    return "";
  }

  switch (playerStatus.data!.status) {
    case PlaybackState.Play:
    case PlaybackState.Load:
      return `# ${playerStatus.data!.deviceName} is ${PlayerPlaybackStatus[playerStatus.data!.status]} ${
        PlayerModeName[playerStatus.data!.mode]
      }`;

    case PlaybackState.Pause:
      return `# ${playerStatus.data!.deviceName} set ${PlayerModeName[playerStatus.data!.mode]} on pause`;

    case PlaybackState.Stop:
    case PlaybackState.None:
      return `# ${playerStatus.data!.deviceName} is stopped`;
  }
}

function getCoverArt(playerStatus: UsePromiseReturnType<PlayerStatus>): string {
  if (
    playerStatus.isLoading ||
    playerStatus.error ||
    playerStatus.data!.status === PlaybackState.Stop ||
    playerStatus.data!.status === PlaybackState.Load
  ) {
    return "";
  }

  return `![](${playerStatus.data!.recording?.coverArt || COVER_NOT_FOUND}?raycast-width=250&raycast-height=250)`;
}
