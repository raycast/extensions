import { Action, ActionPanel, Icon } from "@raycast/api";
import type { PlaybackStatus } from "@/core/audio/audio-player";
import { strings } from "@/strings";

// 快进快退的步长，各界面一致。
const SEEK_STEP_SECONDS = 5;

// 有东西在播时才出现的停止、快进快退、重播：作用于全局播放器，各界面共用。
export function PlaybackControlsSection({
  playingId,
  playbackStatus,
  onStop,
  onSeek,
  onRestart,
  onResume,
}: {
  playingId: string | null;
  playbackStatus: PlaybackStatus;
  onStop: () => void;
  onSeek: (deltaSeconds: number) => void;
  onRestart: () => void;
  onResume: () => void;
}) {
  if (playingId === null) return null;

  return (
    <ActionPanel.Section title={strings.sectionPlayback}>
      <Action
        title={strings.stopPlayback}
        icon={Icon.StopFilled}
        shortcut={{ modifiers: ["cmd"], key: "-" }}
        onAction={onStop}
      />
      <Action
        title={strings.seekBackward}
        icon={Icon.RewindFilled}
        shortcut={{ modifiers: ["opt"], key: "arrowLeft" }}
        onAction={() => onSeek(-SEEK_STEP_SECONDS)}
      />
      <Action
        title={strings.seekForward}
        icon={Icon.ForwardFilled}
        shortcut={{ modifiers: ["opt"], key: "arrowRight" }}
        onAction={() => onSeek(SEEK_STEP_SECONDS)}
      />
      <Action
        title={strings.restartTrack}
        icon={Icon.RotateClockwise}
        shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
        onAction={() => {
          onRestart();
          if (playbackStatus === "Paused") {
            onResume();
          }
        }}
      />
    </ActionPanel.Section>
  );
}
