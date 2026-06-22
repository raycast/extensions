import { MenuBarExtra, Icon, Color, launchCommand, LaunchType, environment, open } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { loadPomodoroState, formatTimer, getRemainingSeconds } from "./lib/pomodoro-state";
import { tickPomodoro } from "./lib/pomodoro-engine";
import { getPendingAlerts } from "./lib/alerts";
import { getCachedTaskCounts } from "./lib/menu-bar-cache";

/**
 * Menu bar must finish in <9s. No network/API calls here — only LocalStorage reads.
 * Task counts are cached by the background-check command (every 5 min).
 * Timer display is computed from endsAt, refreshed every 10s (Raycast platform minimum).
 */
export default function MenuBar() {
  const { data, isLoading } = useCachedPromise(
    async () => {
      let pomo = await loadPomodoroState();

      // Advance phase only when timer has actually expired
      if (pomo.isRunning && pomo.endsAt && pomo.endsAt <= Date.now()) {
        await tickPomodoro();
        pomo = await loadPomodoroState();
      }

      const [alerts, counts] = await Promise.all([getPendingAlerts(), getCachedTaskCounts()]);

      return { pomo, alerts, overdue: counts.overdue, urgent: counts.urgent };
    },
    [],
    { keepPreviousData: true },
  );

  const pomo = data?.pomo;
  const alerts = data?.alerts ?? [];
  const overdue = data?.overdue ?? 0;
  const urgent = data?.urgent ?? 0;

  if (isLoading && !pomo) {
    return <MenuBarExtra isLoading />;
  }

  const remaining = pomo ? getRemainingSeconds(pomo) : 0;
  const hasAlert = alerts.length > 0;
  const timerActive = pomo && pomo.phase !== "idle" && pomo.isRunning;

  let title = "TickTick";
  let icon = Icon.CheckCircle;

  if (timerActive && pomo!.phase === "work") {
    title = `🍅 ${formatTimer(remaining)}`;
    icon = Icon.Clock;
  } else if (timerActive && (pomo!.phase === "short_break" || pomo!.phase === "long_break")) {
    title = `☕ ${formatTimer(remaining)}`;
    icon = Icon.Mug;
  } else if (pomo && pomo.phase !== "idle" && !pomo.isRunning) {
    title = `⏸ ${formatTimer(remaining)}`;
    icon = Icon.Pause;
  } else if (hasAlert) {
    title = alerts[alerts.length - 1]?.title?.slice(0, 20) ?? "TickTick";
    icon = Icon.Bell;
  } else if (overdue > 0) {
    title = `⚠️ ${overdue} overdue`;
    icon = Icon.ExclamationMark;
  } else if (urgent > 0) {
    title = `🔴 ${urgent} urgent`;
    icon = Icon.ExclamationMark;
  }

  const isBackground = environment.launchType === "background";

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading && !data}>
      {pomo && pomo.phase !== "idle" && (
        <MenuBarExtra.Item
          title={`${pomo.phase === "work" ? "Focus" : "Break"}: ${formatTimer(remaining)}`}
          subtitle={pomo.isRunning ? (isBackground ? "Running · updates every ~10s" : "Running") : "Paused"}
          icon={pomo.phase === "work" ? Icon.Clock : Icon.Mug}
          onAction={() => launchCommand({ name: "pomodoro", type: LaunchType.UserInitiated })}
        />
      )}

      {hasAlert &&
        alerts
          .slice(-3)
          .map((a) => <MenuBarExtra.Item key={a.id} title={a.title} subtitle={a.message} icon={Icon.Bell} />)}

      {overdue > 0 && (
        <MenuBarExtra.Item
          title={`${overdue} overdue task${overdue !== 1 ? "s" : ""}`}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          onAction={() => launchCommand({ name: "overdue", type: LaunchType.UserInitiated })}
        />
      )}

      {urgent > 0 && (
        <MenuBarExtra.Item
          title={`${urgent} high-priority task${urgent !== 1 ? "s" : ""}`}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
          onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
        />
      )}

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Today"
        icon={Icon.Calendar}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        onAction={() => launchCommand({ name: "today", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Inbox"
        icon={Icon.Tray}
        shortcut={{ modifiers: ["cmd"], key: "i" }}
        onAction={() => launchCommand({ name: "inbox", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Quick Add"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        onAction={() => launchCommand({ name: "quick-add", type: LaunchType.UserInitiated })}
      />
      <MenuBarExtra.Item
        title="Pomodoro"
        icon={Icon.Clock}
        shortcut={{ modifiers: ["cmd"], key: "p" }}
        onAction={() => launchCommand({ name: "pomodoro", type: LaunchType.UserInitiated })}
      />

      <MenuBarExtra.Separator />

      <MenuBarExtra.Item
        title="Open TickTick Web"
        icon={Icon.Globe}
        onAction={() => open("https://ticktick.com/webapp")}
      />
    </MenuBarExtra>
  );
}
