import { LaunchType, showHUD, environment } from "@raycast/api";
import { processStateChange } from "./lib/state-machine";
import { detectLockStateWithInfo } from "./lib/detector";
import { loadState, loadMetrics } from "./lib/storage";
import { formatDuration } from "./lib/formatter";

/**
 * Update Lock State — no-view 命令
 *
 * 这是整个扩展的"心跳"，每 60 秒由 Raycast Background Refresh 自动调用。
 * 职责：
 * 1. 检测当前锁屏状态
 * 2. 与上一次状态对比
 * 3. 若状态变化则计算时间差并更新指标
 * 4. 写入 LocalStorage
 */
export default async function Command() {
  const isManual = environment.launchType === LaunchType.UserInitiated;

  try {
    // 手动触发时先做诊断检测
    if (isManual) {
      const detectResult = await detectLockStateWithInfo();
      if (!detectResult.success) {
        await showHUD(`⚠️ Detection failed: ${detectResult.error?.substring(0, 80) || "Unknown error"}`);
        return;
      }
    }

    await processStateChange();

    // 手动触发时显示详细信息
    if (isManual) {
      const state = await loadState();
      const metrics = await loadMetrics();
      await showHUD(`✓ State: ${state.current} | Today locked: ${formatDuration(metrics.todayLockedMs)}`);
    }
  } catch (error) {
    if (isManual) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      await showHUD(`✗ Error: ${msg.substring(0, 100)}`);
    }
  }
}
