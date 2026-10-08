import { MenuBarExtra, Icon, LaunchType, launchCommand } from "@raycast/api";
import { useLockData } from "./hooks/use-lock-data";
import { formatDuration, formatTimeRange } from "./lib/formatter";
import { resetToday } from "./lib/storage";

/**
 * Lock Time Menu Bar — 菜单栏命令
 *
 * 在 macOS 菜单栏显示今日累计锁屏时长，
 * 展开后可查看详细统计信息并执行操作。
 */
export default function Command() {
  const { metrics, isLoading, revalidate } = useLockData({ eagerRefresh: true });
  const hasValidLastLockRange = metrics.lastLockStartAt > 0 && metrics.lastLockEndAt >= metrics.lastLockStartAt;

  // 菜单栏标题：显示今日锁屏时长
  const title = `${formatDuration(metrics.todayLockedMs)} locked`;

  return (
    <MenuBarExtra icon={Icon.Lock} title={title} isLoading={isLoading}>
      <MenuBarExtra.Section title="Today">
        <MenuBarExtra.Item title={`Today Locked: ${formatDuration(metrics.todayLockedMs)}`} icon={Icon.Clock} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Last Session">
        <MenuBarExtra.Item
          title={`Last Lock: ${formatDuration(metrics.lastLockDurationMs)}${
            hasValidLastLockRange ? `  (${formatTimeRange(metrics.lastLockStartAt, metrics.lastLockEndAt)})` : ""
          }`}
          icon={Icon.Lock}
        />
        <MenuBarExtra.Item title={`Last Focus: ${formatDuration(metrics.lastUnlockIntervalMs)}`} icon={Icon.Monitor} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Lock Stats"
          icon={Icon.Eye}
          onAction={async () => {
            await launchCommand({
              name: "lock-stats",
              type: LaunchType.UserInitiated,
            });
          }}
        />
        <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
        <MenuBarExtra.Item
          title="Reset Today"
          icon={Icon.Trash}
          onAction={async () => {
            await resetToday();
            await revalidate();
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
