import { LocalStorage } from "@raycast/api";
import { StateData, MetricsData, STORAGE_KEYS } from "./types";
import { getTodayDateString } from "./formatter";
import { MAX_TODAY_SESSIONS } from "./constants";

/**
 * 默认状态数据（首次运行时使用）
 */
export function getDefaultState(): StateData {
  return {
    current: "unlocked",
    lastChangeAt: Date.now(),
  };
}

/**
 * 默认指标数据（首次运行或日期切换时使用）
 */
export function getDefaultMetrics(): MetricsData {
  return {
    todayLockedMs: 0,
    lastLockDurationMs: 0,
    lastUnlockIntervalMs: 0,
    todayDate: getTodayDateString(),
    lastLockStartAt: 0,
    lastLockEndAt: 0,
    todaySessions: [],
  };
}

/**
 * 计算今天已经过去的时长（ms），用于 todayLockedMs 合理性校验
 */
function getTodayElapsedMs(now = Date.now()): number {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  return now - todayStart.getTime();
}

/**
 * 从 LocalStorage 读取状态数据
 */
export async function loadState(): Promise<StateData> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.STATE);
  if (!raw) return getDefaultState();

  try {
    return JSON.parse(raw) as StateData;
  } catch {
    return getDefaultState();
  }
}

/**
 * 从 LocalStorage 读取指标数据
 * 包含日期切换逻辑：如果存储的日期与今天不同，自动重置 todayLockedMs
 */
export async function loadMetrics(): Promise<MetricsData> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.METRICS);
  if (!raw) return getDefaultMetrics();

  try {
    const metrics = JSON.parse(raw) as MetricsData;
    const today = getTodayDateString();

    // 兼容旧数据：补充新增字段默认值
    if (metrics.lastLockStartAt === undefined) metrics.lastLockStartAt = 0;
    if (metrics.lastLockEndAt === undefined) metrics.lastLockEndAt = 0;
    if (!Array.isArray(metrics.todaySessions)) metrics.todaySessions = [];
    if (metrics.todaySessions.length > MAX_TODAY_SESSIONS) {
      metrics.todaySessions = metrics.todaySessions.slice(-MAX_TODAY_SESSIONS);
    }

    // 日期切换：重置今日累计锁屏时长和会话列表
    if (metrics.todayDate !== today) {
      return {
        ...metrics,
        todayLockedMs: 0,
        todaySessions: [],
        todayDate: today,
      };
    }

    // 合理性校验：todayLockedMs 不应超过今天已过去时长，也不应为负数
    const maxTodayMs = getTodayElapsedMs();
    if (metrics.todayLockedMs < 0 || metrics.todayLockedMs > maxTodayMs) {
      return {
        ...metrics,
        todayLockedMs: Math.min(Math.max(metrics.todayLockedMs, 0), maxTodayMs),
      };
    }

    return metrics;
  } catch {
    return getDefaultMetrics();
  }
}

/**
 * 保存状态数据到 LocalStorage
 */
export async function saveState(state: StateData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.STATE, JSON.stringify(state));
}

/**
 * 保存指标数据到 LocalStorage
 */
export async function saveMetrics(metrics: MetricsData): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(metrics));
}

/**
 * 重置今日统计数据（保留 lastLockDurationMs 和 lastUnlockIntervalMs）
 */
export async function resetToday(): Promise<void> {
  const metrics = await loadMetrics();
  metrics.todayLockedMs = 0;
  metrics.todaySessions = [];
  metrics.todayDate = getTodayDateString();
  await saveMetrics(metrics);
}

/**
 * 重置所有数据（恢复到初始状态）
 */
export async function resetAll(): Promise<void> {
  await saveState(getDefaultState());
  await saveMetrics(getDefaultMetrics());
}
