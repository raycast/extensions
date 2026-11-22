import { Clipboard, Toast, showToast } from "@raycast/api";
import type { Project } from "@/core/projects/types";
import { findLatestProjectBounce } from "@/core/projects/bounces";
import type { PlayBounce } from "@/core/ui/hooks/use-audio-player";
import { showFailure } from "@/core/ui/shared/toast";
import { strings } from "@/strings";

// 播放和复制最新 bounce：Search Projects 与 Tracklist 共用，保证两处口径一致。

/** 播放项目的最新 bounce；没有 bounce 时提示。 */
export function playProjectBounce(project: Project, play: PlayBounce): void {
  const latestBouncePath = findLatestProjectBounce(project);
  if (!latestBouncePath) {
    void showToast({ style: Toast.Style.Failure, title: strings.noBounces });
    return;
  }
  play(project.id, latestBouncePath, {
    onError: (message) => {
      void showFailure(strings.playbackFailed, message);
    },
  });
}

/** 把项目的最新 bounce 复制到剪贴板；没有 bounce 时提示。 */
export async function copyLatestBounce(project: Project): Promise<void> {
  const latestBouncePath = findLatestProjectBounce(project);
  if (!latestBouncePath) {
    void showToast({ style: Toast.Style.Failure, title: strings.noBounces });
    return;
  }
  await Clipboard.copy({ file: latestBouncePath });
  void showToast({
    style: Toast.Style.Success,
    title: strings.bounceCopied,
    message: latestBouncePath.split("/").pop() ?? "",
  });
}
