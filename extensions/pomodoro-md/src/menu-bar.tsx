import {
  Icon,
  MenuBarExtra,
  launchCommand,
  LaunchType,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { TimerState, getRemainingMs, formatRemaining } from "./timer";
import {
  CompletionContext,
  completedTypeOf,
  settle,
  stopRunning,
} from "./session";

export default function MenuBarCommand() {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [remaining, setRemaining] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    sync();
  }, []);

  // Tick every second while the menu is open. When the timer runs out,
  // sync() settles it and opens the task list with the completion prompt.
  useEffect(() => {
    if (!timer) return;
    const interval = setInterval(() => {
      const ms = getRemainingMs(timer);
      setRemaining(formatRemaining(ms));
      if (ms <= 0) {
        clearInterval(interval);
        sync();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  async function sync() {
    const { running, finished } = await settle();
    setTimer(running);
    if (running) setRemaining(formatRemaining(getRemainingMs(running)));
    setLoading(false);
    if (finished) {
      await openTaskList({ completedType: completedTypeOf(finished) });
    }
  }

  async function openTaskList(context?: CompletionContext) {
    try {
      await launchCommand({
        name: "start-timer",
        type: LaunchType.UserInitiated,
        context,
      });
    } catch {
      // Start Pomodoro is disabled; the session is already logged, so just say so.
      await showHUD(
        context?.completedType === "break"
          ? "☕ Break over"
          : "✅ Pomodoro done",
      );
    }
  }

  async function handleStop() {
    await stopRunning();
    setTimer(null);
  }

  if (!timer) {
    return (
      <MenuBarExtra icon={Icon.Clock} isLoading={loading}>
        <MenuBarExtra.Item
          title="Start Pomodoro..."
          icon={Icon.Play}
          onAction={() => openTaskList()}
        />
      </MenuBarExtra>
    );
  }

  const icon = timer.isBreak ? Icon.Mug : Icon.Clock;
  const label = timer.subtaskTitle || timer.taskTitle;
  const shortLabel = label.length > 30 ? label.substring(0, 30) + "…" : label;
  const emoji = timer.isBreak ? "☕" : "🍅";

  return (
    <MenuBarExtra
      icon={icon}
      title={`${emoji} ${remaining}`}
      isLoading={loading}
    >
      <MenuBarExtra.Item title={shortLabel} icon={Icon.Document} />
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={`Remaining: ${remaining}`}
          icon={Icon.Clock}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Stop Timer"
          icon={Icon.Stop}
          onAction={handleStop}
        />
        <MenuBarExtra.Item
          title="Switch Task..."
          icon={Icon.ArrowRight}
          onAction={() => openTaskList()}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
