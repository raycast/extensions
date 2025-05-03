import { useCachedPromise } from "@raycast/utils";
import { ReactNode, useEffect, useRef } from "react";
import { getInterestsSelected, getSources } from "../store";
import { LaunchType, launchCommand } from "@raycast/api";

// 进入任何命令（除了Auto Digest），都先判断是否要先跳去onboarding页面。
export default function RedirectRoute(props: { children: ReactNode }) {
  const { children } = props;
  // 如果用usePromise，视图会展示不出来，不知道为何。用useCachedPromise是为了更快地展示视图
  const { data: sources } = useCachedPromise(getSources);
  const { data: interestsSelected } = useCachedPromise(getInterestsSelected);
  const showInterestsSelectPanel =
    !!sources && interestsSelected !== undefined && sources.length === 0 && interestsSelected === false;

  const temp = useRef({
    showInterestsSelectPanel,
  }).current;

  temp.showInterestsSelectPanel = showInterestsSelectPanel;

  const dataReady = !!sources && interestsSelected !== undefined;

  // 若用useEffect，flickering 会更明显
  useEffect(() => {
    if (showInterestsSelectPanel) {
      // 考虑第一次缓存的结果是true，下次再进来如果立刻执行，会导致跳转到 source list页面
      setTimeout(() => {
        if (!temp.showInterestsSelectPanel) return;
        launchCommand({ name: "manage-source-list.command", type: LaunchType.UserInitiated });
      }, 100);
    }
  }, [showInterestsSelectPanel]);

  if (showInterestsSelectPanel) {
    return null;
  }

  if (!dataReady) return null;

  return children;
}
