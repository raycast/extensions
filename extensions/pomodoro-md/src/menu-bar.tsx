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
  describeError,
  settle,
  stopSession,
} from "./session";

// While another command holds the session lock, sync is retried a few times
// so the countdown recovers without waiting for the next background refresh.
const SYNC_RETRY_MS = 300;
const SYNC_MAX_RETRIES = 5;

export default function MenuBarCommand() {
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [remaining, setRemaining] = useState<string>("");
  const [loading, setLoading] = useState(true);
  // Why the last sync could not read the timer, shown in the menu instead of
  // pretending there is no timer.
  const [problem, setProblem] = useState<string | null>(null);

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

  async function sync(attempt = 0) {
    const settled = await settle();
    if (settled.status === "busy") {
      // Another command is updating the timer: keep what we show and retry.
      setLoading(false);
      if (attempt < SYNC_MAX_RETRIES) {
        setTimeout(() => sync(attempt + 1), SYNC_RETRY_MS);
      } else {
        setProblem("Timer is busy — try again");
      }
      return;
    }
    if (settled.status === "error") {
      setLoading(false);
      setProblem(describeError(settled.error));
      return;
    }
    setProblem(null);
    const { running, finished } = settled;
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
    const result = await stopSession();
    if (result.status === "busy") {
      await showHUD("⏳ Timer is busy — try again");
      return;
    }
    if (result.status === "error") {
      await showHUD(
        `⚠️ Could not stop the timer: ${describeError(result.error)}`,
      );
      return;
    }
    setTimer(null);
  }

  const problemItem = problem ? (
    <MenuBarExtra.Section>
      <MenuBarExtra.Item
        title={`⚠️ ${problem}`}
        icon={Icon.Warning}
        onAction={() => sync()}
      />
    </MenuBarExtra.Section>
  ) : null;

  if (!timer) {
    return (
      <MenuBarExtra icon={Icon.Clock} isLoading={loading}>
        {problemItem}
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
      {problemItem}
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
