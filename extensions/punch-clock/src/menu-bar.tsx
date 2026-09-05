import { useEffect, useState } from "react";
import { Icon, MenuBarExtra, launchCommand, LaunchType, Color } from "@raycast/api";
import {
  getState,
  stopTimer,
  resumeTimer,
  clearState,
  getRemainingMs,
  formatClock,
  formatDuration,
  TimerState,
} from "./timer";

export default function Command() {
  const [state, setState] = useState<TimerState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [, forceTick] = useState(0);

  // Load the persisted timer state once on mount (and whenever Raycast
  // re-invokes this menu-bar command on its refresh interval).
  useEffect(() => {
    getState()
      .then(setState)
      .finally(() => setIsLoading(false));
  }, []);

  // Tick every second so the countdown updates live while the instance stays mounted.
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleStop() {
    if (!state) return;
    const updated = await stopTimer(state);
    setState(updated);
  }

  async function handleResume() {
    if (!state) return;
    const updated = await resumeTimer(state);
    setState(updated);
  }

  async function handleReset() {
    await clearState();
    setState(undefined);
  }

  async function handleStartNew() {
    await launchCommand({ name: "start-timer", type: LaunchType.UserInitiated });
  }

  if (!state) {
    return (
      <MenuBarExtra icon={Icon.Clock} title="No Timer" isLoading={isLoading}>
        <MenuBarExtra.Item title="No working timer running" icon={Icon.Info} />
        <MenuBarExtra.Item title="Start Timer…" icon={Icon.Play} onAction={handleStartNew} />
      </MenuBarExtra>
    );
  }

  const remainingMs = getRemainingMs(state);
  const isOvertime = remainingMs < 0;
  const isRunning = state.running;

  let icon: MenuBarExtra.Props["icon"] = Icon.Clock;
  let title: string;

  if (!isRunning) {
    icon = { source: Icon.Pause, tintColor: Color.Yellow };
    title = `Paused · ${formatDuration(remainingMs)}`;
  } else if (isOvertime) {
    icon = { source: Icon.ExclamationMark, tintColor: Color.Red };
    title = `+${formatDuration(remainingMs).replace("-", "")} over`;
  } else {
    icon = { source: Icon.Clock, tintColor: Color.Green };
    title = formatDuration(remainingMs);
  }

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      <MenuBarExtra.Section title="Punch Clock">
        <MenuBarExtra.Item title={`Started: ${formatClock(state.startTime)}`} icon={Icon.Play} />
        <MenuBarExtra.Item
          title={`Expires: ${formatClock(state.endTime)}`}
          icon={isOvertime ? Icon.ExclamationMark : Icon.Flag}
        />
        {state.stoppedTime && (
          <MenuBarExtra.Item title={`Stopped: ${formatClock(state.stoppedTime)}`} icon={Icon.Pause} />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        {isRunning ? (
          <MenuBarExtra.Item title="Stop Timer" icon={Icon.Pause} onAction={handleStop} />
        ) : (
          <MenuBarExtra.Item title="Resume Timer" icon={Icon.Play} onAction={handleResume} />
        )}
        <MenuBarExtra.Item title="Start New Timer…" icon={Icon.Repeat} onAction={handleStartNew} />
        <MenuBarExtra.Item title="Reset" icon={Icon.Trash} onAction={handleReset} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
