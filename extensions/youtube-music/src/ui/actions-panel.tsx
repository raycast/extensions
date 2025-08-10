import { ActionPanel, Action, Icon } from "@raycast/api";
import playPause from "../play-pause";
import nextTrack from "../next-track";
import previousTrack from "../previous-track";
import fastForward from "../fast-forward";
import rewind from "../rewind";
import muteUnmute from "../mute-unmute";
import volumeUp from "../volume-up";
import volumeDown from "../volume-down";
import likeButton from "../like-unlike";
import dislikeUndislikeButton from "../dislike-undislike";
import type { ContentInfo } from "../models/now-playing";

interface NowPlayingActionsPanelProps {
  info: ContentInfo;
  skipSeconds: number;
}

export default function NowPlayingActionsPanel({ info, skipSeconds }: NowPlayingActionsPanelProps) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Playback">
        <Action
          title={info.isPlaying ? "Pause" : "Play"}
          icon={info.isPlaying ? Icon.Pause : Icon.Play}
          onAction={async () => {
            await playPause(false);
          }}
        />
        <Action
          title="Next Track"
          icon={Icon.ChevronRight}
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            await nextTrack(false);
          }}
        />
        <Action
          title="Previous Track"
          icon={Icon.ChevronLeft}
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            await previousTrack(false);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Seek">
        <Action
          title={`${skipSeconds}s Forward`}
          icon={Icon.Forward}
          shortcut={{ modifiers: [], key: "arrowRight" }}
          onAction={async () => {
            await fastForward(false);
          }}
        />
        <Action
          title={`${skipSeconds}s Backward`}
          icon={Icon.Rewind}
          shortcut={{ modifiers: [], key: "arrowLeft" }}
          onAction={async () => {
            await rewind(false);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Volume">
        <Action
          title={info.isMuted ? "Unmute" : "Mute"}
          icon={info.isMuted ? Icon.SpeakerOff : Icon.SpeakerOn}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={async () => {
            await muteUnmute(false);
          }}
        />
        <Action
          title="Volume Up"
          icon={Icon.SpeakerHigh}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowUp" }}
          onAction={async () => {
            await volumeUp(false);
          }}
        />
        <Action
          title="Volume Down"
          icon={Icon.SpeakerLow}
          shortcut={{ modifiers: ["cmd", "shift"], key: "arrowDown" }}
          onAction={async () => {
            await volumeDown(false);
          }}
        />
      </ActionPanel.Section>

      <ActionPanel.Section title="Reactions">
        <Action
          title={info.isLiked ? "Unlike" : "Like"}
          icon={info.isLiked ? Icon.Undo : Icon.Heart}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={async () => {
            await likeButton();
          }}
        />
        <Action
          title={info.isDisliked ? "Undislike" : "Dislike"}
          icon={info.isDisliked ? Icon.Undo : Icon.HeartDisabled}
          shortcut={{ modifiers: ["cmd"], key: "d" }}
          onAction={async () => {
            await dislikeUndislikeButton();
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
