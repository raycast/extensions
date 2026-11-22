import { Action, Icon } from "@raycast/api";
import type { PlaybackStatus } from "@/core/audio/audio-player";
import { strings } from "@/strings";

// 主播放操作：未播→播；本行在播→暂停；暂停→续播。各界面都放在第二个操作，由 Raycast 自动给 ⌘↵。
export function PlayToggleAction({
  isThisPlaying,
  playbackStatus,
  onPlay,
  onPause,
  onResume,
}: {
  isThisPlaying: boolean;
  playbackStatus: PlaybackStatus;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const toggleIsPause = isThisPlaying && (playbackStatus === "Playing" || playbackStatus === "Starting");
  const title = isThisPlaying
    ? playbackStatus === "Paused"
      ? strings.resumePlayback
      : playbackStatus === "Stopping"
        ? strings.stoppingPlayback
        : strings.pausePlayback
    : strings.playLatestBounce;

  return (
    <Action
      title={title}
      icon={isThisPlaying ? (toggleIsPause ? Icon.PauseFilled : Icon.PlayFilled) : Icon.Play}
      onAction={() => {
        if (isThisPlaying) {
          if (playbackStatus === "Stopping") {
            return;
          }
          if (playbackStatus === "Paused") {
            onResume();
          } else {
            onPause();
          }
          return;
        }
        onPlay();
      }}
    />
  );
}
