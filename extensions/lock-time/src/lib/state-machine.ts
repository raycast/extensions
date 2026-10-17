import { detectLockStateWithInfo } from "./detector";
import { loadState, loadMetrics, saveState, saveMetrics } from "./storage";
import { MetricsData, StateData } from "./types";
import { MAX_TODAY_SESSIONS } from "./constants";
import { logEvent } from "./logger";

/**
 * 间隙检测阈值：90 秒
 *
 * 如果两次轮询之间的间隔超过此阈值，说明 Mac 在此期间可能处于锁屏/休眠状态。
 * 该阈值为正常轮询间隔（60 秒）的 1.5 倍，足以排除正常的调度抖动，
 * 同时能捕捉到短暂的锁屏事件。
 *
 * 注意：在 macOS 26 上，Raycast 后台 interval 在锁屏期间仍然执行，
 * 因此间隙检测主要作为兜底方案，正常情况下通过 Swift CGSession 直接检测锁屏状态。
 */
const GAP_THRESHOLD_MS = 90 * 1000;
/**
 * 计算 elapsed 中属于"今天"的部分（严格按本地时间 0 点切割）
 *
 * 场景：lastChangeAt=昨天23:00, now=今天08:00, elapsed=9h
 * → todayStart=今天00:00
 * → todayPortion = now - todayStart = 8h（只算今天的部分）
 *
 * 如果 lastChangeAt 已经在今天，则全部算今天：
 * → todayPortion = now - lastChangeAt = elapsed
 *
 * @param lastChangeAt - 上一次状态变更时间戳（Unix ms）
 * @param now - 当前时间戳（Unix ms）
 * @returns 属于今天的时长（ms）
 */
function getTodayPortionMs(lastChangeAt: number, now: number): number {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayStartMs = todayStart.getTime();

  if (lastChangeAt >= todayStartMs) {
    // lastChangeAt 在今天内，全部 elapsed 属于今天
    return now - lastChangeAt;
  }
  // lastChangeAt 在今天之前，只计入 0 点之后的部分
  return now - todayStartMs;
}

/**
 * 追加今日会话，并限制列表长度，避免 LocalStorage 无限增长。
 */
function appendTodaySession(metrics: MetricsData, lockAt: number, unlockAt: number, durationMs: number): void {
  const existingIdx = metrics.todaySessions.findIndex((s) => s.lockAt === lockAt);
  if (existingIdx >= 0) {
    if (unlockAt >= metrics.todaySessions[existingIdx].unlockAt) {
      metrics.todaySessions[existingIdx] = { lockAt, unlockAt, durationMs };
    }
    return;
  }

  metrics.todaySessions.push({ lockAt, unlockAt, durationMs });
  if (metrics.todaySessions.length > MAX_TODAY_SESSIONS) {
    metrics.todaySessions = metrics.todaySessions.slice(-MAX_TODAY_SESSIONS);
  }
}

/**
 * 状态机核心处理函数
 *
 * 每次被调用时（由 update-lock-state 命令的 interval 触发）：
 * 1. 读取存储中的上一次状态和指标
 * 2. 通过 Swift CGSession / AppleScript 检测当前实际锁屏状态
 * 3. 根据状态变化或持续状态更新指标数据
 * 4. 保存更新后的状态和指标
 *
 * 状态转换场景：
 * - UNLOCKED → LOCKED：记录 lastUnlockIntervalMs（解锁持续时长）
 * - LOCKED → UNLOCKED：记录 lastLockDurationMs（锁屏持续时长），累加 todayLockedMs
 * - LOCKED → LOCKED：持续累加 todayLockedMs（轮询间隔的时间差）
 * - UNLOCKED → UNLOCKED：无需特别处理
 *
 * 间隙检测（Gap Detection）兜底：
 * - 若在某些 macOS 版本上后台 interval 不执行，通过时间间隙推断锁屏
 *
 * 检测失败处理：
 * - 如果所有检测方法都失败，保持上一次状态不变，仅更新时间戳
 *
 * 性能优化：
 * - 并行读取 state 和 metrics
 * - 只有在数据变化时才写入 Storage
 */
export async function processStateChange(): Promise<void> {
  const now = Date.now();

  // 1. 并行读取存储数据（优化：从串行改为并行）
  const [prevState, metrics] = await Promise.all([loadState(), loadMetrics()]);

  // 2. 检测当前锁屏状态（使用带诊断信息的版本）
  const detectResult = await detectLockStateWithInfo();

  const elapsed = now - prevState.lastChangeAt;

  // 如果检测失败，保持上一次状态不变。lastChangeAt 仅在上次为 locked 时推进（已计入时长），
  // 否则保持不变，避免在「实际已锁屏但检测失败」时丢失 elapsed 时间：
  // 若推进 lastChangeAt，下次成功检测时的 duration 会从失败时刻算起，真实锁屏时长将永久丢失。
  if (!detectResult.success) {
    let metricsChangedOnFailure = false;

    // 上一状态为 locked 时，检测失败期间仍应累计锁屏时长，并推进 lastChangeAt（避免下次重复累计）。
    if (prevState.current === "locked" && elapsed > 0 && elapsed <= 24 * 60 * 60 * 1000) {
      const todayPortion = getTodayPortionMs(prevState.lastChangeAt, now);
      metrics.todayLockedMs += todayPortion;
      metricsChangedOnFailure = true;
    }

    const newStateOnFailure: StateData = {
      current: prevState.current,
      lastChangeAt: prevState.current === "locked" ? now : prevState.lastChangeAt,
    };

    logEvent({
      timestamp: now,
      action: "detection_failed",
      prevState: prevState.current,
      currentState: prevState.current,
      elapsed,
      method: "none",
      todayLockedMs: metrics.todayLockedMs,
      detail: "Detection failed, state unchanged",
    });

    if (metricsChangedOnFailure) {
      await Promise.all([saveState(newStateOnFailure), saveMetrics(metrics)]);
    } else {
      await saveState(newStateOnFailure);
    }

    return;
  }

  const currentLockState = detectResult.state;

  // 防御：如果时间差为负值（系统时钟回拨），记录异常日志并跳过本次处理
  // 注意：elapsed > 24h 是合法场景（Mac 深度睡眠数天后唤醒），不应跳过，交给正常状态机处理
  if (elapsed < 0) {
    const newState: StateData = {
      current: currentLockState,
      lastChangeAt: now,
    };

    logEvent({
      timestamp: now,
      action: "anomaly",
      prevState: prevState.current,
      currentState: currentLockState,
      elapsed,
      method: detectResult.method,
      todayLockedMs: metrics.todayLockedMs,
      detail: `Negative elapsed time (clock skew): ${elapsed}ms`,
    });

    await saveState(newState);
    return;
  }

  // 标记是否有数据变化（用于避免不必要的写入）
  let metricsChanged = false;

  // 3. 根据状态转换更新指标
  if (prevState.current !== currentLockState) {
    // ─── 直接状态转换 ───
    if (prevState.current === "unlocked" && currentLockState === "locked") {
      // UNLOCKED → LOCKED：记录解锁持续时长
      // 若 elapsed > 间隙阈值，推断间隙期间为锁屏，先累加今日锁屏时长，避免丢失
      if (elapsed > GAP_THRESHOLD_MS) {
        const todayPortion = getTodayPortionMs(prevState.lastChangeAt, now);
        metrics.todayLockedMs += todayPortion;
        metrics.lastLockDurationMs = elapsed;
        metrics.lastUnlockIntervalMs = 0;
        metrics.lastLockStartAt = prevState.lastChangeAt;
        metricsChanged = true;

        logEvent({
          timestamp: now,
          action: "state_change",
          prevState: prevState.current,
          currentState: currentLockState,
          elapsed,
          method: detectResult.method,
          todayLockedMs: metrics.todayLockedMs,
          detail: `UNLOCKED → LOCKED (gap inferred as locked: ${todayPortion}ms)`,
        });
      } else {
        // 使用 lastLockEndAt（上次解锁时间）计算真实解锁持续时长，
        // 而非 elapsed（elapsed 仅为最后一次 poll 间隔 ~60s，因为 lastChangeAt 每次 poll 都会更新）
        metrics.lastUnlockIntervalMs = metrics.lastLockEndAt > 0 ? now - metrics.lastLockEndAt : elapsed;
        // 记录锁屏开始时间，供后续 LOCKED→UNLOCKED 使用
        metrics.lastLockStartAt = now;
        metricsChanged = true;

        logEvent({
          timestamp: now,
          action: "state_change",
          prevState: prevState.current,
          currentState: currentLockState,
          elapsed,
          method: detectResult.method,
          todayLockedMs: metrics.todayLockedMs,
          detail: "UNLOCKED → LOCKED",
        });
      }
    } else if (prevState.current === "locked" && currentLockState === "unlocked") {
      // LOCKED → UNLOCKED：记录锁屏持续时长，累加今日锁屏时长
      // 使用 lastLockStartAt（在 UNLOCKED→LOCKED 时记录的锁屏开始时间）计算真实锁屏持续时长，
      // 而非 elapsed（如果锁屏期间有 LOCKED→LOCKED poll，elapsed 仅为最后一次 poll 间隔 ~60s）
      const lockStartAt = metrics.lastLockStartAt > 0 ? metrics.lastLockStartAt : prevState.lastChangeAt;
      metrics.lastLockDurationMs = now - lockStartAt;
      metrics.lastLockEndAt = now;
      metrics.lastLockStartAt = lockStartAt; // 保留供 UI 展示时间范围

      // todayLockedMs 增量累加：仅加最后一个 poll 间隔（之前的已在 LOCKED→LOCKED 中累加）
      const todayPortion = getTodayPortionMs(prevState.lastChangeAt, now);
      metrics.todayLockedMs += todayPortion;

      // 记录锁屏会话到今日列表：使用真实的锁屏开始时间（跨天时按 0 点切割）
      const todayStartMs = new Date(now).setHours(0, 0, 0, 0);
      const sessionLockAt = Math.max(lockStartAt, todayStartMs);
      const sessionDuration = getTodayPortionMs(lockStartAt, now);
      appendTodaySession(metrics, sessionLockAt, now, sessionDuration);

      metricsChanged = true;

      logEvent({
        timestamp: now,
        action: "state_change",
        prevState: prevState.current,
        currentState: currentLockState,
        elapsed,
        method: detectResult.method,
        todayLockedMs: metrics.todayLockedMs,
        detail: `LOCKED → UNLOCKED (today portion: ${todayPortion}ms)`,
      });
    }
  } else if (currentLockState === "locked") {
    // ─── 持续锁屏：累加今日锁屏时长 ───
    const todayPortion = getTodayPortionMs(prevState.lastChangeAt, now);
    metrics.todayLockedMs += todayPortion;
    metricsChanged = true;

    // 降频日志：每 5 分钟记录一次持续锁屏状态（避免日志量过大）
    const shouldLog = elapsed > 5 * 60 * 1000 || prevState.lastChangeAt === 0;
    if (shouldLog) {
      logEvent({
        timestamp: now,
        action: "poll",
        prevState: prevState.current,
        currentState: currentLockState,
        elapsed,
        method: detectResult.method,
        todayLockedMs: metrics.todayLockedMs,
        detail: `Continuous locked (today portion: ${todayPortion}ms)`,
      });
    }
  } else if (currentLockState === "unlocked" && elapsed > GAP_THRESHOLD_MS) {
    // ─── 间隙检测（Gap Detection）兜底 ───
    // 前后状态都是 "unlocked"，但时间间隔远超正常轮询间隔。
    // 推断该间隙为锁屏/休眠，显式建模为 locked 区间：保存 current=locked、lastChangeAt=间隙起点。
    // 不在本 tick 累加 todayLockedMs，由下一 tick 的 LOCKED→UNLOCKED 一次性计入完整 elapsed，
    // 避免「本次累加 + 后续 locked 累积/解锁转换」重复计入重叠时间。
    metrics.lastLockStartAt = prevState.lastChangeAt;

    const gapState: StateData = {
      current: "locked",
      lastChangeAt: prevState.lastChangeAt,
    };

    logEvent({
      timestamp: now,
      action: "gap_detected",
      prevState: prevState.current,
      currentState: currentLockState,
      elapsed,
      method: detectResult.method,
      todayLockedMs: metrics.todayLockedMs,
      detail: `Gap inferred as locked, will add on next LOCKED→UNLOCKED (elapsed: ${elapsed}ms)`,
    });

    await Promise.all([saveState(gapState), saveMetrics(metrics)]);
    return;
  }

  // 4. 保存状态和指标（优化：并行写入，且只在有变化时写入 metrics）
  const newState: StateData = {
    current: currentLockState,
    lastChangeAt: now,
  };

  if (metricsChanged) {
    await Promise.all([saveState(newState), saveMetrics(metrics)]);
  } else {
    // 只有状态时间戳变化，只写入 state
    await saveState(newState);
  }
}
