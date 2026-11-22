import { LocalStorage, showToast, Toast } from "@raycast/api";
import { strings } from "@/strings";
import { clearProjectListCache } from "@/core/projects/list-cache";
import { clearBounceListCache } from "@/core/projects/bounce-list";
import { clearBounceCountCache } from "@/core/projects/load-projects";
import { clearPersistentProjectFileCache } from "@/core/projects/project-file-cache";
import { clearAudioAnalysisCache } from "@/core/projects/audio-cache";
import { clearViewPrefs } from "@/core/ui/shared/view-prefs";
import { ONBOARDING_ASKED_KEY, ONBOARDING_UNMATCHED_KEY } from "./use-onboarding";

/** 开发用：清掉所有缓存类状态，让扩展回到第一次打开的样子。
 *  只碰缓存和引导记录，不碰标签、合集、曲号、Role、项目元数据、笔记和歌词。 */
export async function resetToFirstRun(): Promise<void> {
  clearProjectListCache();
  clearBounceListCache();
  clearBounceCountCache();
  clearViewPrefs();
  await clearPersistentProjectFileCache();
  await clearAudioAnalysisCache();
  await LocalStorage.removeItem(ONBOARDING_ASKED_KEY);
  await LocalStorage.removeItem(ONBOARDING_UNMATCHED_KEY);
  await showToast({ style: Toast.Style.Success, title: strings.resetToFirstRun, message: strings.resetToFirstRunHint });
}
