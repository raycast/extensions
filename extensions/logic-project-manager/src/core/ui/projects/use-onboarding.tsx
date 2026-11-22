import { useCallback, useRef } from "react";
import { confirmAlert, LocalStorage, openExtensionPreferences, useNavigation } from "@raycast/api";
import { strings } from "@/strings";
import { getAllProjectMetadata } from "@/core/metadata/project-metadata";
import { resolveSharedBouncesFolder, unmatchedSharedBounces } from "@/core/projects/bounces";
import type { Project } from "@/core/projects/types";
import { UnmatchedBounces } from "@/core/ui/bounces";
import { onboardingStep } from "./onboarding-step";

// 首次使用引导：问过共享文件夹没有；上次弹「未匹配」提示时用的共享文件夹路径。
export const ONBOARDING_ASKED_KEY = "onboarding:shared-bounces-asked";
export const ONBOARDING_UNMATCHED_KEY = "onboarding:unmatched-shown-for";

/** 首次使用引导：没设共享文件夹时问一次；换了共享文件夹时，有未匹配的 bounce 就提示一次。 */
export function useOnboarding(input: { getProjects: () => Project[]; reloadProjects: () => Promise<string[]> }): {
  runOnboarding: () => Promise<void>;
} {
  const { push } = useNavigation();
  const { getProjects, reloadProjects } = input;
  // 每次渲染都是新函数，不能进依赖：用 ref 存最新值，照 useDocWatcher 的 onChangeRef。
  const getProjectsRef = useRef(getProjects);
  getProjectsRef.current = getProjects;
  const reloadProjectsRef = useRef(reloadProjects);
  reloadProjectsRef.current = reloadProjects;
  // 首次使用引导每次打开最多弹一个。
  const onboardingShownRef = useRef(false);

  const runOnboarding = useCallback(async () => {
    if (onboardingShownRef.current) return;
    const folder = resolveSharedBouncesFolder();
    // 两条分支各只读一个键，和原来一样。
    const askedValue = folder === null ? ((await LocalStorage.getItem<string>(ONBOARDING_ASKED_KEY)) ?? null) : null;
    const unmatchedValue =
      folder === null ? null : ((await LocalStorage.getItem<string>(ONBOARDING_UNMATCHED_KEY)) ?? null);
    const step = onboardingStep({ folder, askedValue, unmatchedValue });
    if (step === "skip") return;

    if (folder === null) {
      // 必须在 confirmAlert 的 await 之前置位，否则连点两次会弹两个框。
      onboardingShownRef.current = true;
      await confirmAlert({
        title: strings.onboardingSharedTitle,
        message: strings.onboardingSharedMessage,
        primaryAction: { title: strings.openPreferences, onAction: () => void openExtensionPreferences() },
        dismissAction: { title: strings.skip },
      });
      await LocalStorage.setItem(ONBOARDING_ASKED_KEY, "true");
      return;
    }

    // 先记下这个文件夹：没有未匹配的也算判断过，换文件夹前不再重复检查。
    await LocalStorage.setItem(ONBOARDING_UNMATCHED_KEY, folder);
    const metadataStore = await getAllProjectMetadata();
    const claimed = Object.values(metadataStore).flatMap((metadata) => metadata.externalBounceFiles);
    const count = unmatchedSharedBounces(claimed).length;
    if (count === 0) return;
    onboardingShownRef.current = true;
    await confirmAlert({
      title: strings.onboardingUnmatchedTitle.replace("{count}", String(count)),
      message: strings.onboardingUnmatchedMessage,
      primaryAction: {
        title: strings.review,
        onAction: () =>
          push(
            <UnmatchedBounces projects={getProjectsRef.current()} onChanged={() => void reloadProjectsRef.current()} />,
          ),
      },
      dismissAction: { title: strings.skip },
    });
  }, [push]);

  return { runOnboarding };
}
