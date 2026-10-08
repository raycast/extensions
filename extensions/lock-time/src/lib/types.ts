/**
 * 锁屏状态类型
 */
export type LockState = "locked" | "unlocked";

/**
 * 当前状态数据（存储在 lock-time:state）
 */
export interface StateData {
  /** 当前锁屏状态 */
  current: LockState;
  /** 上一次状态变更时间戳（Unix ms） */
  lastChangeAt: number;
}

/**
 * 单次锁屏会话记录
 */
export interface LockSession {
  /** 锁屏开始时间戳（Unix ms） */
  lockAt: number;
  /** 解锁时间戳（Unix ms） */
  unlockAt: number;
  /** 持续时长（ms） */
  durationMs: number;
}

/**
 * 统计指标数据（存储在 lock-time:metrics）
 */
export interface MetricsData {
  /** 今日累计锁屏时长（ms） */
  todayLockedMs: number;
  /** 上一次锁屏持续时长（ms） */
  lastLockDurationMs: number;
  /** 上一次解锁到锁屏的间隔时长（ms） */
  lastUnlockIntervalMs: number;
  /** 今日日期，用于日期切换检测（"YYYY-MM-DD"） */
  todayDate: string;
  /** 上一次锁屏开始时间戳（Unix ms） */
  lastLockStartAt: number;
  /** 上一次解锁时间戳（Unix ms） */
  lastLockEndAt: number;
  /** 今日锁屏会话列表 */
  todaySessions: LockSession[];
}

/**
 * 完整的 Lock Time 数据结构
 */
export interface LockTimeData {
  state: StateData;
  metrics: MetricsData;
}

/**
 * Storage Key 常量
 */
export const STORAGE_KEYS = {
  STATE: "lock-time:state",
  METRICS: "lock-time:metrics",
} as const;
