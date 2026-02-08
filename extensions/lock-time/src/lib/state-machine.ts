import { detectLockStateWithInfo } from "./detector";
import { loadState, loadMetrics, saveState, saveMetrics } from "./storage";
import { StateData } from "./types";

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
  const detectResult = detectLockStateWithInfo();

  const elapsed = now - prevState.lastChangeAt;

  // 如果检测失败，保持上一次状态不变，仅更新时间戳
  if (!detectResult.success) {
    const newState: StateData = {
      current: prevState.current,
      lastChangeAt: now,
    };
    await saveState(newState);
    return;
  }

  const currentLockState = detectResult.state;

  // 防御：如果时间差异常（负值或超过 24 小时），跳过本次处理
  if (elapsed < 0 || elapsed > 24 * 60 * 60 * 1000) {
    const newState: StateData = {
      current: currentLockState,
      lastChangeAt: now,
    };
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
      metrics.lastUnlockIntervalMs = elapsed;
      metricsChanged = true;
    } else if (prevState.current === "locked" && currentLockState === "unlocked") {
      // LOCKED → UNLOCKED：记录锁屏持续时长，累加今日锁屏时长
      metrics.lastLockDurationMs = elapsed;
      metrics.todayLockedMs += elapsed;
      metricsChanged = true;
    }
  } else if (currentLockState === "locked") {
    // ─── 持续锁屏：累加今日锁屏时长 ───
    metrics.todayLockedMs += elapsed;
    metricsChanged = true;
  } else if (currentLockState === "unlocked" && elapsed > GAP_THRESHOLD_MS) {
    // ─── 间隙检测（Gap Detection）兜底 ───
    // 前后状态都是 "unlocked"，但时间间隔远超正常轮询间隔。
    // 这说明 Mac 在此期间处于锁屏/休眠状态，Raycast 后台任务未执行。
    // 将整个间隙记为锁屏时长。
    metrics.lastLockDurationMs = elapsed;
    metrics.todayLockedMs += elapsed;
    metricsChanged = true;
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
