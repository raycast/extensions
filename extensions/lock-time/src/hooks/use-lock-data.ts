import { useEffect, useState, useCallback, useRef } from "react";
import { loadState, loadMetrics } from "../lib/storage";
import { StateData, MetricsData } from "../lib/types";
import { getDefaultState, getDefaultMetrics } from "../lib/storage";
import { processStateChange } from "../lib/state-machine";

const REVALIDATE_INTERVAL_MS = 10_000;

interface UseLockDataOptions {
  /**
   * 打开时立即执行一次 processStateChange，确保 LOCKED→UNLOCKED 等状态转换
   * 在用户看到数据之前就已处理。竞态风险极低（~0.3%）且可自修复。
   */
  eagerRefresh?: boolean;
}

interface UseLockDataResult {
  /** 当前状态数据 */
  state: StateData;
  /** 统计指标数据 */
  metrics: MetricsData;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 重新加载数据 */
  revalidate: () => Promise<void>;
}

/**
 * 自定义 Hook：读取锁屏统计数据
 *
 * 两阶段加载策略：
 * 1. Phase 1：立即从 LocalStorage 加载缓存数据展示（<0.5s）
 * 2. Phase 2（eagerRefresh）：后台执行 processStateChange 追赶最新状态，再刷新（~1-2s）
 * 3. Phase 3：定时 re-poll LocalStorage，捕获后台 update-lock-state 的持续更新
 */
export function useLockData(opts?: UseLockDataOptions): UseLockDataResult {
  const [state, setState] = useState<StateData>(getDefaultState());
  const [metrics, setMetrics] = useState<MetricsData>(getDefaultMetrics());
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  const revalidate = useCallback(async () => {
    try {
      const [loadedState, loadedMetrics] = await Promise.all([loadState(), loadMetrics()]);
      if (mountedRef.current) {
        setState(loadedState);
        setMetrics(loadedMetrics);
      }
    } catch {
      // 加载失败时保持默认值
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await revalidate();

      if (opts?.eagerRefresh) {
        await processStateChange();
        if (mountedRef.current) {
          await revalidate();
        }
      }
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [revalidate, opts?.eagerRefresh]);

  // 定时 re-poll：捕获后台 update-lock-state 命令的持续更新
  useEffect(() => {
    const timer = setInterval(() => {
      if (mountedRef.current) {
        revalidate();
      }
    }, REVALIDATE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  return { state, metrics, isLoading, revalidate };
}
