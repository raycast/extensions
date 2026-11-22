import { useCallback, useEffect, useRef } from "react";
import { showToast, Toast } from "@raycast/api";
import type { Project } from "@/core/projects/types";
import type { PlaybackStatus } from "@/core/audio/audio-player";
import { playbackToastContent } from "./playback-toast";

/** 播放时一直显示的 Toast：title 是曲名，message 是进度；暂停或停止时隐藏。
 *  返回的 isPlaybackToastActive 给读 current Set 的地方用：正在播放时不弹进度提示，免得盖住它。 */
export function usePlaybackToast(
  projects: Project[],
  player: {
    playbackStatus: PlaybackStatus;
    playingId: string | null;
    positionSeconds: number;
    durationSeconds: number;
  },
): { isPlaybackToastActive: () => boolean } {
  const { playbackStatus, playingId, positionSeconds, durationSeconds } = player;
  const toastRef = useRef<Toast | null>(null);
  const toastBusyRef = useRef(false);
  const toastActiveRef = useRef(false);

  useEffect(() => {
    const playingProject = projects.find((p) => p.id === playingId);
    const content = playbackToastContent({
      projectName: playingProject?.title ?? "",
      playingId,
      playbackStatus,
      positionSeconds,
      durationSeconds,
    });
    // 必须在 showToast 的 await 之前同步赋值：读 current Set 的地方靠它决定要不要弹进度提示。
    toastActiveRef.current = content.active;

    if (content.active) {
      if (toastRef.current) {
        toastRef.current.title = content.title;
        toastRef.current.message = content.message;
      } else if (!toastBusyRef.current) {
        toastBusyRef.current = true;
        void showToast({ style: Toast.Style.Animated, title: content.title, message: content.message }).then(
          (toast) => {
            toastBusyRef.current = false;
            if (!toastActiveRef.current) {
              void toast.hide();
              return;
            }
            toastRef.current = toast;
          },
        );
      }
    } else if (toastRef.current) {
      void toastRef.current.hide();
      toastRef.current = null;
    }
  }, [playbackStatus, playingId, projects, positionSeconds, durationSeconds]);

  // 引用要稳定：它会进 refreshCurrentSets 的依赖，一变就会让重载和目录监听全部重跑。
  const isPlaybackToastActive = useCallback(() => toastActiveRef.current, []);

  return { isPlaybackToastActive };
}
