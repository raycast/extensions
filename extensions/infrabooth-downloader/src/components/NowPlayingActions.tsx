import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { sendControl } from "../lib/commands";
import { crossPlatformShortcut } from "../lib/shortcuts";
import type { RemoteState, RemoteTrack } from "@/lib/remote-protocol";
import { stepVolume, toggleMuteVolume } from "../lib/volume";
import { DownloadTrackAction } from "./DownloadTrackAction";

function PlayPauseAction({ isPlaying }: { isPlaying: boolean }) {
  return (
    <Action
      title={isPlaying ? "Pause" : "Play"}
      icon={isPlaying ? Icon.Pause : Icon.Play}
      onAction={() => sendControl(isPlaying ? { type: "pause" } : { type: "resume" })}
    />
  );
}

interface Props {
  state: RemoteState;
  track: RemoteTrack;
  index: number;
}

export function NowPlayingActions({ state, track, index }: Props) {
  const isPlaying = state.state === "playing";
  const isMuted = state.volume === 0;

  return (
    <ActionPanel>
      <ActionPanel.Section>
        {index !== state.cursor && (
          <Action title="Play This Track" icon={Icon.Play} onAction={() => sendControl({ type: "skipTo", index })} />
        )}
        <PlayPauseAction isPlaying={isPlaying} />
        <Action
          title="Next Track"
          icon={Icon.Forward}
          shortcut={crossPlatformShortcut(["cmd"], "arrowRight")}
          onAction={() => sendControl({ type: "next" })}
        />
        <Action
          title="Previous Track"
          icon={Icon.Rewind}
          shortcut={crossPlatformShortcut(["cmd"], "arrowLeft")}
          onAction={() => sendControl({ type: "previous" })}
        />
        <Action
          title="Toggle Shuffle"
          icon={Icon.Shuffle}
          shortcut={Keyboard.Shortcut.Common.Save}
          onAction={() => sendControl({ type: "toggleShuffle" })}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action
          title="Increase Volume"
          icon={Icon.SpeakerUp}
          shortcut={crossPlatformShortcut(["opt", "cmd"], "arrowUp")}
          onAction={() => sendControl({ type: "setVolume", volume: stepVolume(state.volume, 1) })}
        />
        <Action
          title="Decrease Volume"
          icon={Icon.SpeakerDown}
          shortcut={crossPlatformShortcut(["opt", "cmd"], "arrowDown")}
          onAction={() => sendControl({ type: "setVolume", volume: stepVolume(state.volume, -1) })}
        />
        <Action
          title={isMuted ? "Unmute" : "Mute"}
          icon={isMuted ? Icon.SpeakerOn : Icon.SpeakerOff}
          shortcut={crossPlatformShortcut(["cmd"], "m")}
          onAction={async () => sendControl({ type: "setVolume", volume: await toggleMuteVolume(state.volume) })}
        />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <DownloadTrackAction track={track} />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
