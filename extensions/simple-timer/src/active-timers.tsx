import { useEffect, useState } from "react";
import { List, Action, ActionPanel, Icon, Color, showHUD, useNavigation } from "@raycast/api";
import { TimerEntry, getActiveTimers, pauseTimer, resumeTimer, cancelTimer } from "./timer-state";
import { stopAlertSound } from "./sound";
import { formatCountdown, formatElapsed } from "./utils";
import { StopwatchRunning } from "./stopwatch-running";
import { PomodoroRunning } from "./pomodoro-running";
import { TimerRunning } from "./timer-running";

interface Props {
  onRefresh?: () => void;
}

export function ActiveTimers({ onRefresh }: Props) {
  const [timers, setTimers] = useState<TimerEntry[]>([]);
  const { push, pop } = useNavigation();

  function refresh() {
    const active = getActiveTimers();
    setTimers(active);
    onRefresh?.();
    if (active.length === 0) pop();
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 500);
    return () => clearInterval(interval);
  }, []);

  const running = timers.filter(t => t.status === "running");
  const paused  = timers.filter(t => t.status === "paused");

  function renderTimer(t: TimerEntry) {
    const isStopwatch = t.type === "stopwatch";
    const isPomodoro = t.type === "pomodoro";
    const pomPhase = t.pomodoroPhase === "work" ? "Work" : "Break";
    const subtitle = isStopwatch
      ? formatElapsed(t.elapsed)
      : isPomodoro
      ? `${formatCountdown(t.remaining)}  ${pomPhase} · Cycle ${t.pomodoroCycle ?? 1}`
      : formatCountdown(t.remaining);

    return (
      <List.Item
        key={t.id}
        icon={t.type === "stopwatch"
          ? { source: Icon.Stopwatch, tintColor: t.status === "running" ? Color.Blue : Color.Yellow }
          : t.type === "pomodoro"
          ? { source: Icon.Clock, tintColor: t.pomodoroPhase === "work" ? Color.Red : Color.Green }
          : t.status === "running"
          ? { source: Icon.Play, tintColor: Color.Green }
          : { source: Icon.Pause, tintColor: Color.Yellow }
        }
        title={t.label}
        subtitle={subtitle}
        accessories={t.note ? [{ text: t.note, icon: Icon.Pencil }] : []}
        actions={
          <ActionPanel>
            <Action
              title={t.type === "stopwatch" ? "Open Stopwatch" : t.type === "pomodoro" ? "Open Pomodoro" : "Open Timer"}
              icon={t.type === "stopwatch" ? Icon.Stopwatch : Icon.Clock}
              onAction={() => t.type === "stopwatch"
                ? push(<StopwatchRunning stopwatchId={t.id} />)
                : t.type === "pomodoro"
                ? push(<PomodoroRunning pomodoroId={t.id} />)
                : push(<TimerRunning timerId={t.id} />)
              }
            />
            <Action
              title="Cancel"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["ctrl"], key: "return" }}
              onAction={() => { stopAlertSound(t.id); cancelTimer(t.id); refresh(); showHUD(`❌ ${t.label} cancelled`); }}
            />
            {t.status === "running" ? (
              <Action
                title="Pause"
                icon={{ source: Icon.Pause, tintColor: Color.Yellow }}
                shortcut={{ modifiers: [], key: "space" }}
                onAction={() => { pauseTimer(t.id); refresh(); }}
              />
            ) : (
              <Action
                title="Resume"
                icon={{ source: Icon.Play, tintColor: Color.Green }}
                shortcut={{ modifiers: [], key: "space" }}
                onAction={() => { resumeTimer(t.id); refresh(); }}
              />
            )}
          </ActionPanel>
        }
      />
    );
  }

  if (timers.length === 0) {
    return (
      <List navigationTitle="Active Timers">
        <List.EmptyView icon={Icon.Stopwatch} title="No active timers" description="All timers are either finished or none started" />
      </List>
    );
  }

  return (
    <List navigationTitle="Active Timers">
      {running.length > 0 && <List.Section title="Running">{running.map(renderTimer)}</List.Section>}
      {paused.length  > 0 && <List.Section title="Paused">{paused.map(renderTimer)}</List.Section>}
    </List>
  );
}
