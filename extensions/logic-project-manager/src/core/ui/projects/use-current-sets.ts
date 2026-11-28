import { useCallback, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { daw } from "@/daws";
import type { Project } from "@/core/projects/types";
import { findCurrentSet } from "@/core/projects/current-set";
import { runBatched } from "@/core/projects/run-batched";
import {
  cachedSetMetadata,
  loadPersistentProjectFileCache,
  parseSetMetadata,
} from "@/core/projects/project-file-cache";
import { labels } from "@/daws/labels";
import { LOG_PREFIX } from "@/core/log";
import {
  applySetMetadata,
  planCurrentSetReads,
  shouldShowSetProgress,
  type CurrentSetInfo,
} from "./current-sets-state";

// 同时解析的 Set 数，和 View Sets 一样。
const METADATA_CONCURRENCY = 3;

/** 读出每个项目 current Set 的元数据：有缓存的立刻显示，其余在后台解析，读完一个显示一个。 */
export function useCurrentSets(input: { isPlaybackToastActive: () => boolean }): {
  currentSets: Record<string, CurrentSetInfo>;
  readingSets: boolean;
  refreshCurrentSets: (list: Project[]) => Promise<void>;
} {
  const { isPlaybackToastActive } = input;
  const [currentSets, setCurrentSets] = useState<Record<string, CurrentSetInfo>>({});
  const [readingSets, setReadingSets] = useState(false);
  // 每次读取编号：新一轮开始后，旧一轮的结果不再写入。
  const currentSetsRunRef = useRef(0);

  const refreshCurrentSets = useCallback(
    async (list: Project[]) => {
      // 必须在第一个 await 之前同步加一，否则旧轮次作废不掉。
      const run = ++currentSetsRunRef.current;
      await loadPersistentProjectFileCache();
      if (run !== currentSetsRunRef.current) return;

      const { initial, missing } = await planCurrentSetReads(
        list,
        (project) => daw.listSets(project),
        findCurrentSet,
        cachedSetMetadata,
        () => run !== currentSetsRunRef.current,
      );
      if (run !== currentSetsRunRef.current) return;
      setCurrentSets(initial);
      setReadingSets(missing.length > 0);
      if (missing.length === 0) return;

      const toast = shouldShowSetProgress(missing.length, isPlaybackToastActive())
        ? await showToast({ style: Toast.Style.Animated, title: labels.readingSets, message: `0 / ${missing.length}` })
        : null;

      let done = 0;
      await runBatched(
        missing,
        async ([id, set]) => {
          try {
            const metadata = await parseSetMetadata(set);
            if (run !== currentSetsRunRef.current) return;
            setCurrentSets((prev) => applySetMetadata(prev, id, set, metadata));
          } catch (error) {
            console.error(`${LOG_PREFIX} Failed to load set metadata: ${set.path}`, error);
          }
          done++;
          if (toast) toast.message = `${done} / ${missing.length}`;
        },
        { concurrency: METADATA_CONCURRENCY, isCancelled: () => run !== currentSetsRunRef.current },
      );

      void toast?.hide();
      // 只有最新一轮能关掉加载状态，否则旧轮次结束会把新一轮的关掉。
      if (run === currentSetsRunRef.current) setReadingSets(false);
    },
    [isPlaybackToastActive],
  );

  return { currentSets, readingSets, refreshCurrentSets };
}
