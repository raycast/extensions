import { strings } from "@/strings";
import { formatTime } from "@/core/ui/shared/format";
import type { PlaybackStatus } from "@/core/audio/audio-player";

export type PlaybackToastContent = { active: boolean; title: string; message: string };

/** 常驻 Toast 该显示什么：只在播放中显示，title 是曲名，message 是进度。 */
export function playbackToastContent(input: {
  projectName: string;
  playingId: string | null;
  playbackStatus: PlaybackStatus;
  positionSeconds: number;
  durationSeconds: number;
}): PlaybackToastContent {
  const active =
    input.playingId !== null && (input.playbackStatus === "Starting" || input.playbackStatus === "Playing");
  if (!active) return { active: false, title: "", message: "" };

  // 标题放歌名（主文字色），说明放进度（次要文字色）；动作名已经写了 Play Latest Bounce，这里不重复。
  // 还不知道歌名时（如刚从后台恢复、列表未载入）退回 "Playing Latest Bounce"。
  const title = input.projectName || strings.playingLatestBounce;
  const message =
    input.durationSeconds > 0 ? `${formatTime(input.positionSeconds)} / ${formatTime(input.durationSeconds)}` : "";
  return { active: true, title, message };
}
