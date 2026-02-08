import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Clipboard } from "@raycast/api";
import { useLockData } from "./hooks/use-lock-data";
import { formatDuration } from "./lib/formatter";
import { resetToday, resetAll } from "./lib/storage";
import { detectLockStateWithInfo } from "./lib/detector";
import { processStateChange } from "./lib/state-machine";
import { useState } from "react";

/**
 * Lock Stats — View 命令
 *
 * 展示锁屏统计信息：
 * - Today Locked Time：今日累计锁屏时长
 * - Last Lock Duration：上一次锁屏持续时长
 * - Last Unlock Interval：上一次解锁到锁屏的连续工作时间
 */
export default function Command() {
  const { state, metrics, isLoading, revalidate } = useLockData();
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);

  /**
   * 运行一次状态检测并刷新数据
   */
  async function handleUpdateNow() {
    await processStateChange();
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "State updated" });
  }

  /**
   * 诊断检测：测试检测方法是否正常
   */
  async function handleDiagnostic() {
    // 诊断时跳过缓存，强制重新检测
    const result = detectLockStateWithInfo(true);
    if (result.success) {
      setDiagnosticInfo(`✓ Detection OK — [${result.method}] ${result.detail} → ${result.state}`);
      await showToast({
        style: Toast.Style.Success,
        title: "Detection works!",
        message: `[${result.method}] ${result.detail}`,
      });
    } else {
      setDiagnosticInfo(`✗ Detection failed — ${result.error}`);
      await showToast({
        style: Toast.Style.Failure,
        title: "Detection failed",
        message: result.error || "All detection methods failed.",
      });
    }
  }

  /**
   * 重置今日数据
   */
  async function handleResetToday() {
    await resetToday();
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "Today's data has been reset" });
  }

  /**
   * 重置所有数据
   */
  async function handleResetAll() {
    await resetAll();
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "All data has been reset" });
  }

  /**
   * 复制统计信息到剪贴板
   */
  async function handleCopyStats() {
    const text = [
      `Lock Time Stats`,
      `───────────────`,
      `Today Locked Time:    ${formatDuration(metrics.todayLockedMs)}`,
      `Last Lock Duration:   ${formatDuration(metrics.lastLockDurationMs)}`,
      `Last Unlock Interval: ${formatDuration(metrics.lastUnlockIntervalMs)}`,
      `Current State:        ${state.current === "locked" ? "Locked" : "Unlocked"}`,
    ].join("\n");

    await Clipboard.copy(text);
    await showToast({ style: Toast.Style.Success, title: "Stats copied to clipboard" });
  }

  // 公共 Actions 面板
  const sharedActions = (
    <ActionPanel>
      <Action
        title="Update Now"
        icon={Icon.Play}
        shortcut={{ modifiers: ["cmd"], key: "u" }}
        onAction={handleUpdateNow}
      />
      <Action title="Refresh View" icon={Icon.ArrowClockwise} onAction={revalidate} />
      <Action
        title="Test Detection"
        icon={Icon.Heartbeat}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={handleDiagnostic}
      />
      <Action title="Copy Stats" icon={Icon.Clipboard} onAction={handleCopyStats} />
      <ActionPanel.Section title="Reset">
        <Action
          title="Reset Today"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={handleResetToday}
        />
        <Action
          title="Reset All Data"
          icon={Icon.ExclamationMark}
          style={Action.Style.Destructive}
          onAction={handleResetAll}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading}>
      <List.Section title="Today">
        <List.Item
          title="Today Locked Time"
          subtitle={formatDuration(metrics.todayLockedMs)}
          icon={{ source: Icon.Clock, tintColor: Color.Blue }}
          accessories={[{ text: "Cumulative lock time today" }]}
          actions={sharedActions}
        />
      </List.Section>

      <List.Section title="Last Session">
        <List.Item
          title="Last Lock Duration"
          subtitle={formatDuration(metrics.lastLockDurationMs)}
          icon={{ source: Icon.Lock, tintColor: Color.Orange }}
          accessories={[{ text: "Duration of last lock" }]}
          actions={sharedActions}
        />
        <List.Item
          title="Last Unlock Interval"
          subtitle={formatDuration(metrics.lastUnlockIntervalMs)}
          icon={{ source: Icon.Monitor, tintColor: Color.Green }}
          accessories={[{ text: "Focus time between unlocks" }]}
          actions={sharedActions}
        />
      </List.Section>

      <List.Section title="Status">
        <List.Item
          title="Current State"
          subtitle={state.current === "locked" ? "Locked" : "Unlocked"}
          icon={{
            source: state.current === "locked" ? Icon.Lock : Icon.LockUnlocked,
            tintColor: state.current === "locked" ? Color.Red : Color.Green,
          }}
          actions={sharedActions}
        />
      </List.Section>

      {diagnosticInfo && (
        <List.Section title="Diagnostic">
          <List.Item
            title={diagnosticInfo}
            icon={{
              source: diagnosticInfo.startsWith("✓") ? Icon.CheckCircle : Icon.ExclamationMark,
              tintColor: diagnosticInfo.startsWith("✓") ? Color.Green : Color.Red,
            }}
            actions={sharedActions}
          />
        </List.Section>
      )}
    </List>
  );
}
