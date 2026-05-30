import { MenuBarExtra, LocalStorage, showHUD, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchTasks, TaskData } from "./utils/api";

type TimerState = {
  isActive: boolean;
  mode: "work" | "break";
  targetEndAt: number | null;
  pausedRemainingSec: number | null;
  startedAt: number | null;
  activeTaskId: string | null;
  activeTaskTitle: string | null;
};

export default function Command() {
  const [state, setState] = useState<TimerState | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  // Load state and tasks
  async function loadData() {
    try {
      const keys = [
        "timer-is-active",
        "timer-mode",
        "timer-target-end",
        "timer-paused-remaining",
        "timer-started-at",
        "timer-active-task-id",
        "timer-active-task-title",
      ];
      const values = await Promise.all(
        keys.map((k) => LocalStorage.getItem<string>(k)),
      );

      const isAct = values[0] === "true";
      const mode = (values[1] as "work" | "break") || "work";
      const targetEnd = values[2] ? parseInt(values[2]) : null;
      const pausedRemaining = values[3] ? parseInt(values[3]) : 2400;
      const started = values[4] ? parseInt(values[4]) : null;
      const activeTaskId = values[5] || null;
      const activeTaskTitle = values[6] || null;

      setState({
        isActive: isAct,
        mode,
        targetEndAt: targetEnd,
        pausedRemainingSec: pausedRemaining,
        startedAt: started,
        activeTaskId,
        activeTaskTitle,
      });

      const list = await fetchTasks().catch(() => []);
      setTasks(list.filter((t) => t.status !== "Completada"));
    } catch {
      // Fail silently to prevent crashing the menu bar
    }
  }

  useEffect(() => {
    loadData();
    // Refresh tasks and timer status every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update timer ticks locally every second if active
  useEffect(() => {
    if (!state?.isActive) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [state?.isActive]);

  if (!state) return null;

  // Compute remaining seconds
  const remainingSec = (() => {
    if (!state.isActive || !state.targetEndAt) {
      return state.pausedRemainingSec ?? 2400;
    }
    return Math.max(0, Math.round((state.targetEndAt - now) / 1000));
  })();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const menuTitle = `${state.mode === "work" ? "🔵" : "🟢"} ${formatTime(remainingSec)}`;

  // Handlers
  async function toggleTimer() {
    if (!state) return;
    const isAct = !state.isActive;
    const nowTs = Date.now();
    let targetEnd = state.targetEndAt;
    let started = state.startedAt;
    let pausedRemaining = state.pausedRemainingSec;

    if (isAct) {
      const duration = pausedRemaining ?? (state.mode === "work" ? 2400 : 600);
      targetEnd = nowTs + duration * 1000;
      started = started ?? nowTs;
      pausedRemaining = null;
    } else {
      pausedRemaining = remainingSec;
      targetEnd = null;
    }

    setState((prev) =>
      prev
        ? {
            ...prev,
            isActive: isAct,
            targetEndAt: targetEnd,
            pausedRemainingSec: pausedRemaining,
            startedAt: started,
          }
        : null,
    );
    await LocalStorage.setItem("timer-is-active", isAct ? "true" : "false");
    await LocalStorage.setItem(
      "timer-target-end",
      targetEnd ? String(targetEnd) : "",
    );
    await LocalStorage.setItem(
      "timer-paused-remaining",
      pausedRemaining ? String(pausedRemaining) : "",
    );
    await LocalStorage.setItem(
      "timer-started-at",
      started ? String(started) : "",
    );

    await showHUD(isAct ? "▶️ Timer Started" : "⏸️ Timer Paused");
  }

  async function skipTimer() {
    if (!state) return;
    const nextMode = state.mode === "work" ? "break" : "work";
    const nextDuration = nextMode === "work" ? 2400 : 600;

    setState((prev) =>
      prev
        ? {
            ...prev,
            isActive: false,
            targetEndAt: null,
            pausedRemainingSec: nextDuration,
            mode: nextMode,
            startedAt: null,
          }
        : null,
    );

    await LocalStorage.setItem("timer-is-active", "false");
    await LocalStorage.setItem("timer-mode", nextMode);
    await LocalStorage.setItem("timer-target-end", "");
    await LocalStorage.setItem("timer-paused-remaining", String(nextDuration));
    await LocalStorage.setItem("timer-started-at", "");

    await showHUD(
      `⏭️ Skipped to ${nextMode === "work" ? "Focus" : "Break"} Mode`,
    );
  }

  async function handleSelectTask(task: TaskData) {
    if (!state) return;
    const isCurrentActive = state.activeTaskId === task.id;
    if (isCurrentActive) {
      await LocalStorage.removeItem("timer-active-task-id");
      await LocalStorage.removeItem("timer-active-task-title");
      setState((prev) =>
        prev ? { ...prev, activeTaskId: null, activeTaskTitle: null } : null,
      );
      await showHUD("Task Deselected");
    } else {
      await LocalStorage.setItem("timer-active-task-id", task.id);
      await LocalStorage.setItem("timer-active-task-title", task.title);
      setState((prev) =>
        prev
          ? { ...prev, activeTaskId: task.id, activeTaskTitle: task.title }
          : null,
      );
      await showHUD(`Focusing on: ${task.title}`);
    }
  }

  return (
    <MenuBarExtra
      title={menuTitle}
      icon="icon.png"
      tooltip="BluePomodoro Timer"
    >
      <MenuBarExtra.Section title="Timer">
        <MenuBarExtra.Item
          title={state.isActive ? "Pause Timer" : "Start Timer"}
          icon={state.isActive ? Icon.Pause : Icon.Play}
          onAction={toggleTimer}
        />
        <MenuBarExtra.Item
          title="Skip to Next"
          icon={Icon.ChevronRight}
          onAction={skipTimer}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Active Task">
        <MenuBarExtra.Item
          title={
            state.activeTaskTitle
              ? `Focus: ${state.activeTaskTitle}`
              : "No Task (General Focus)"
          }
          icon={Icon.Clock}
        />
      </MenuBarExtra.Section>

      {tasks.length > 0 && (
        <MenuBarExtra.Section title="Select Focus Task">
          {tasks.map((task) => (
            <MenuBarExtra.Item
              key={task.id}
              title={task.title}
              icon={
                state.activeTaskId === task.id ? Icon.Checkmark : Icon.Circle
              }
              onAction={() => handleSelectTask(task)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
