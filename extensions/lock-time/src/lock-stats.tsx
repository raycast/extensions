import { List, ActionPanel, Action, Icon, Color, showToast, Toast, Clipboard } from "@raycast/api";
import { useLockData } from "./hooks/use-lock-data";
import { formatDuration, formatTimeRange } from "./lib/formatter";
import { resetToday, resetAll, loadState, loadMetrics } from "./lib/storage";
import { detectLockStateWithInfo } from "./lib/detector";
import { processStateChange } from "./lib/state-machine";
import { readRecentLogs, getLogFileSize, getLogFilePath } from "./lib/logger";
import { LockSession } from "./lib/types";
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
  const { state, metrics, isLoading, revalidate } = useLockData({ eagerRefresh: true });
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [metaInfo, setMetaInfo] = useState<string | null>(null);
  const hasValidLastLockRange = metrics.lastLockStartAt > 0 && metrics.lastLockEndAt >= metrics.lastLockStartAt;

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
    const result = await detectLockStateWithInfo(true);

    // 获取元信息（从 storage 实时读取，避免使用可能过时的 React state）
    const currentState = await loadState();
    const lastChangeAgo = Date.now() - currentState.lastChangeAt;
    const logSize = getLogFileSize();
    const logSizeKB = (logSize / 1024).toFixed(1);

    if (result.success) {
      setDiagnosticInfo(`✓ Detection OK — [${result.method}] ${result.detail} → ${result.state}`);
      setMetaInfo(
        `Last change: ${formatDuration(lastChangeAgo)} ago | Log: ${logSizeKB}KB | Date: ${metrics.todayDate}`,
      );
      await showToast({
        style: Toast.Style.Success,
        title: "Detection works!",
        message: `[${result.method}] ${result.detail}`,
      });
    } else {
      setDiagnosticInfo(`✗ Detection failed — ${result.error}`);
      setMetaInfo(`Last change: ${formatDuration(lastChangeAgo)} ago | Log: ${logSizeKB}KB`);
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

  /**
   * 查看事件日志：读取最近 20 条日志并复制到剪贴板
   */
  async function handleViewEventLog() {
    try {
      const logs = readRecentLogs(20);
      if (logs.length === 0) {
        await showToast({ style: Toast.Style.Failure, title: "No event logs found" });
        return;
      }

      const logText = [
        `Lock Time Event Log (recent ${logs.length} entries)`,
        `Log file: ${getLogFilePath()}`,
        `═══════════════════════════════════════`,
        "",
        ...logs.map((log) => {
          const elapsedSec = (log.elapsed / 1000).toFixed(1);
          const todayMin = (log.todayLockedMs / 1000 / 60).toFixed(1);
          return [
            `[${log.iso}]`,
            `  Action:   ${log.action}`,
            `  Transition: ${log.prevState} → ${log.currentState}`,
            `  Elapsed:  ${elapsedSec}s`,
            `  Method:   ${log.method}`,
            `  Today Locked: ${todayMin}min`,
            log.detail ? `  Detail:   ${log.detail}` : null,
            "",
          ]
            .filter(Boolean)
            .join("\n");
        }),
      ].join("\n");

      await Clipboard.copy(logText);
      await showToast({ style: Toast.Style.Success, title: `${logs.length} log entries copied` });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to read logs",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * 导出原始数据：state + metrics JSON + 最近日志
   */
  async function handleExportRawData() {
    try {
      const [currentState, currentMetrics] = await Promise.all([loadState(), loadMetrics()]);
      const logs = readRecentLogs(10);
      const logSize = getLogFileSize();

      const exportData = {
        timestamp: Date.now(),
        iso: new Date().toISOString(),
        state: currentState,
        metrics: currentMetrics,
        meta: {
          lastChangeAgo: Date.now() - currentState.lastChangeAt,
          logFileSize: logSize,
          logFilePath: getLogFilePath(),
        },
        recentLogs: logs,
      };

      const jsonText = JSON.stringify(exportData, null, 2);
      await Clipboard.copy(jsonText);
      await showToast({
        style: Toast.Style.Success,
        title: "Raw data exported",
        message: `${logs.length} logs included`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Export failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
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
      <ActionPanel.Section title="Debug">
        <Action
          title="View Event Log"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
          onAction={handleViewEventLog}
        />
        <Action
          title="Export Raw Data"
          icon={Icon.Document}
          shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
          onAction={handleExportRawData}
        />
        <Action title="Copy Stats" icon={Icon.Clipboard} onAction={handleCopyStats} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Reset">
        <Action title="Reset Today" icon={Icon.Trash} style={Action.Style.Destructive} onAction={handleResetToday} />
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
          accessories={[
            ...(metrics.todaySessions.length > 0 ? [{ tag: `${metrics.todaySessions.length} sessions` }] : []),
            { text: "Cumulative lock time today" },
          ]}
          actions={
            <ActionPanel>
              {metrics.todaySessions.length > 0 && (
                <Action.Push
                  title="View Today Sessions"
                  icon={Icon.List}
                  target={<SessionDetailView sessions={metrics.todaySessions} todayLockedMs={metrics.todayLockedMs} />}
                />
              )}
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
              <ActionPanel.Section title="Debug">
                <Action
                  title="View Event Log"
                  icon={Icon.List}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
                  onAction={handleViewEventLog}
                />
                <Action
                  title="Export Raw Data"
                  icon={Icon.Document}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                  onAction={handleExportRawData}
                />
                <Action title="Copy Stats" icon={Icon.Clipboard} onAction={handleCopyStats} />
              </ActionPanel.Section>
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
          }
        />
      </List.Section>

      <List.Section title="Last Session">
        <List.Item
          title="Last Lock Duration"
          subtitle={`${formatDuration(metrics.lastLockDurationMs)}${
            hasValidLastLockRange ? `  (${formatTimeRange(metrics.lastLockStartAt, metrics.lastLockEndAt)})` : ""
          }`}
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
          {metaInfo && (
            <List.Item
              title="Meta Info"
              subtitle={metaInfo}
              icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
              actions={sharedActions}
            />
          )}
        </List.Section>
      )}
    </List>
  );
}

/**
 * 今日锁屏会话明细视图
 *
 * 通过 Action.Push 从 Today Locked Time 行进入，
 * 展示今日各次锁屏会话的时间区间和持续时长。
 */
function SessionDetailView({ sessions, todayLockedMs }: { sessions: LockSession[]; todayLockedMs: number }) {
  return (
    <List navigationTitle="Today Lock Sessions">
      <List.Section title={`${sessions.length} sessions — Total: ${formatDuration(todayLockedMs)}`}>
        {sessions.map((s, i) => (
          <List.Item
            key={`${s.lockAt}-${s.unlockAt}`}
            title={formatTimeRange(s.lockAt, s.unlockAt)}
            subtitle={formatDuration(s.durationMs)}
            icon={{ source: Icon.Lock, tintColor: Color.Orange }}
            accessories={[{ text: `#${i + 1}` }]}
          />
        ))}
      </List.Section>
    </List>
  );
}
