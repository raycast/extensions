import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useAllTasks } from "./hooks/useTasks";
import { useProjects } from "./hooks/useProjects";
import { FocusSession, Preferences, Task } from "./types";
import { SESSION_CONFIG } from "./constants";

const FOCUS_SESSION_KEY = "focus-session";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function TimerView({
  session,
  durations,
  focusedTask,
  onComplete,
  onReset,
}: {
  session: FocusSession;
  durations: Record<FocusSession["type"], number>;
  focusedTask?: Task;
  onComplete: () => void;
  onReset: () => void;
}) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    let completed = false;
    const update = () => {
      const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
      const left = Math.max(0, session.duration * 60 - elapsed);
      setRemaining(left);

      if (left === 0 && !completed) {
        completed = true;
        const cfg = SESSION_CONFIG[session.type];
        showHUD(`${cfg.label} complete!`);
        onComplete();
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const config = SESSION_CONFIG[session.type];
  const totalSeconds = session.duration * 60;
  const progress = Math.min(1, 1 - remaining / totalSeconds);

  // Wider bar (32 chars) fills the Detail pane nicely; ▓/░ pair reads
  // more cleanly than █/░ at Raycast's default font size.
  const filled = Math.round(progress * 32);
  const progressBar = "▓".repeat(filled) + "░".repeat(32 - filled);

  // Dot-row showing position in the 4-session cycle (● = done, ○ = pending)
  const cyclePos = session.sessionsCompleted % 4;
  const cycleDots = Array.from({ length: 4 }, (_, i) =>
    i < cyclePos ? "●" : "○",
  ).join("  ");

  const cycleCount = Math.floor(session.sessionsCompleted / 4);
  const completedLine =
    session.sessionsCompleted > 0
      ? `**Completed** &nbsp; ${session.sessionsCompleted} session${session.sessionsCompleted !== 1 ? "s" : ""}${cycleCount > 0 ? ` · ${cycleCount} full cycle${cycleCount !== 1 ? "s" : ""}` : ""}`
      : "";

  // Show what comes next so the user can mentally prepare.
  const nextType =
    session.type === "focus"
      ? (session.sessionsCompleted + 1) % 4 === 0
        ? "longBreak"
        : "shortBreak"
      : "focus";
  const nextConfig = SESSION_CONFIG[nextType];
  const nextDuration = durations[nextType];

  const markdown = [
    `# ${config.label}`,
    ...(focusedTask ? [``, `**Working on:** ${focusedTask.title}`] : []),
    ``,
    "```",
    `         ${formatTime(remaining)}`,
    "```",
    ``,
    `${progressBar}  **${Math.round(progress * 100)}%**`,
    ``,
    `---`,
    ``,
    `**Cycle progress** &nbsp; ${cycleDots}`,
    ...(completedLine ? [completedLine] : []),
    ``,
    `**Up next** &nbsp; ${nextConfig.label} · ${nextDuration} min`,
    ``,
    `_Open the Action Panel to skip or stop_`,
  ].join("\n");

  return (
    <Detail
      navigationTitle={`${config.label} — ${formatTime(remaining)}`}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {focusedTask && (
            <Detail.Metadata.Label
              title="Focused Task"
              text={focusedTask.title}
              icon={{ source: Icon.Target, tintColor: Color.Orange }}
            />
          )}
          <Detail.Metadata.Label
            title="Session Type"
            text={config.label}
            icon={{ source: config.icon, tintColor: config.color }}
          />
          <Detail.Metadata.Label
            title="Time Remaining"
            text={formatTime(remaining)}
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Label
            title="Duration"
            text={`${session.duration} min`}
            icon={{ source: Icon.Hourglass, tintColor: Color.SecondaryText }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Sessions Completed"
            text={`${session.sessionsCompleted}`}
            icon={{ source: Icon.Trophy, tintColor: Color.Yellow }}
          />
          <Detail.Metadata.Label
            title="Full Cycles"
            text={`${cycleCount}`}
            icon={{
              source: Icon.RotateClockwise,
              tintColor: Color.SecondaryText,
            }}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Up Next"
            text={`${nextConfig.label} · ${nextDuration} min`}
            icon={{ source: nextConfig.icon, tintColor: nextConfig.color }}
          />
          <Detail.Metadata.Label
            title="Started"
            text={new Date(session.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
            icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action
            title="Skip to Next Session"
            icon={Icon.Forward}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={onComplete}
          />
          <Action
            title="Stop Timer"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["cmd", "shift"], key: "escape" }}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: "Stop Focus Session?",
                message: `You have ${formatTime(remaining)} remaining. Stopping will reset the timer.`,
                primaryAction: {
                  title: "Stop Session",
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (confirmed) onReset();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

export default function FocusTimerCommand() {
  const prefs = getPreferenceValues<Preferences>();
  const durations: Record<FocusSession["type"], number> = {
    focus: parseInt(prefs.pomodoroLength ?? "25"),
    shortBreak: parseInt(prefs.shortBreakLength ?? "5"),
    longBreak: parseInt(prefs.longBreakLength ?? "15"),
  };

  const { tasks } = useAllTasks();
  const { projects } = useProjects();
  const activeTasks = tasks.filter((t) => t.status === 0);

  const [session, setSession] = useState<FocusSession | null>(null);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [focusedTaskId, setFocusedTaskId] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);

  const focusedTask = focusedTaskId
    ? activeTasks.find((t) => t.id === focusedTaskId)
    : undefined;

  useEffect(() => {
    LocalStorage.getItem<string>(FOCUS_SESSION_KEY).then((raw) => {
      if (raw) {
        try {
          const s = JSON.parse(raw) as FocusSession & {
            _sessionsCompleted?: number;
            _focusedTaskId?: string;
          };
          const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
          if (elapsed < s.duration * 60) {
            setSession(s);
            setSessionsCompleted(s.sessionsCompleted);
            if (s._focusedTaskId) setFocusedTaskId(s._focusedTaskId);
          } else {
            setSessionsCompleted(s.sessionsCompleted);
            if (s._focusedTaskId) setFocusedTaskId(s._focusedTaskId);
            LocalStorage.removeItem(FOCUS_SESSION_KEY);
          }
        } catch {
          // ignore
        }
      }
      setLoaded(true);
    });
  }, []);

  function startSession(type: FocusSession["type"], count: number) {
    const s: FocusSession = {
      startTime: Date.now(),
      duration: durations[type],
      type,
      sessionsCompleted: count,
    };
    setSession(s);
    setSessionsCompleted(count);
    LocalStorage.setItem(
      FOCUS_SESSION_KEY,
      JSON.stringify({ ...s, _focusedTaskId: focusedTaskId }),
    );
  }

  function handleSessionComplete() {
    if (!session) return;
    const nextCount =
      session.type === "focus"
        ? session.sessionsCompleted + 1
        : session.sessionsCompleted;
    setSessionsCompleted(nextCount);
    setSession(null);
    LocalStorage.removeItem(FOCUS_SESSION_KEY);
  }

  function resetTimer() {
    setSession(null);
    setSessionsCompleted(0);
    setFocusedTaskId(undefined);
    LocalStorage.removeItem(FOCUS_SESSION_KEY);
  }

  if (!loaded) return <Detail isLoading markdown="" />;

  if (session) {
    return (
      <TimerView
        session={session}
        durations={durations}
        focusedTask={focusedTask}
        onComplete={handleSessionComplete}
        onReset={resetTimer}
      />
    );
  }

  // Determine which session type to suggest next
  const nextType: FocusSession["type"] =
    sessionsCompleted > 0 && sessionsCompleted % 4 === 0
      ? "longBreak"
      : sessionsCompleted > 0
        ? "shortBreak"
        : "focus";

  const sessionTypes: Array<FocusSession["type"]> = [
    "focus",
    "shortBreak",
    "longBreak",
  ];
  // Move recommended session to the top
  const sortedTypes = [nextType, ...sessionTypes.filter((t) => t !== nextType)];

  return (
    <List navigationTitle="Focus Timer">
      {sessionsCompleted > 0 && (
        <List.Section title="Progress">
          <List.Item
            title={`${sessionsCompleted} session${sessionsCompleted !== 1 ? "s" : ""} completed`}
            icon={{ source: Icon.Trophy, tintColor: Color.Yellow }}
            subtitle={
              Math.floor(sessionsCompleted / 4) > 0
                ? `${Math.floor(sessionsCompleted / 4)} full cycle${Math.floor(sessionsCompleted / 4) !== 1 ? "s" : ""}`
                : undefined
            }
            actions={
              <ActionPanel>
                <Action
                  title="Reset Progress"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  onAction={resetTimer}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {focusedTask && (
        <List.Section title="Focused Task">
          <List.Item
            title={focusedTask.title}
            icon={{ source: Icon.Target, tintColor: Color.Orange }}
            subtitle={
              projects.find((p) => p.id === focusedTask.projectId)?.name
            }
            actions={
              <ActionPanel>
                <Action
                  title="Clear Focused Task"
                  icon={Icon.Xmark}
                  onAction={() => setFocusedTaskId(undefined)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section
        title="Start a Session"
        subtitle={
          sessionsCompleted > 0
            ? "Recommended session is first"
            : "Choose your session type"
        }
      >
        {sortedTypes.map((type) => {
          const config = SESSION_CONFIG[type];
          const duration = durations[type];
          const isRecommended = type === nextType && sessionsCompleted > 0;
          return (
            <List.Item
              key={type}
              title={config.label}
              subtitle={isRecommended ? "Up next" : config.description}
              icon={{ source: config.icon, tintColor: config.color }}
              accessories={[
                {
                  tag: {
                    value: `${duration} min`,
                    color: config.color,
                  },
                  tooltip: "Configured in Preferences",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={`Start ${config.label}`}
                    icon={{ source: config.icon, tintColor: config.color }}
                    onAction={() => startSession(type, sessionsCompleted)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {!focusedTask && activeTasks.length > 0 && (
        <List.Section
          title="Focus on a Task"
          subtitle="Optional — select a task to work on"
        >
          {activeTasks.slice(0, 10).map((task) => (
            <List.Item
              key={task.id}
              title={task.title}
              icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
              subtitle={projects.find((p) => p.id === task.projectId)?.name}
              actions={
                <ActionPanel>
                  <Action
                    title="Set as Focused Task"
                    icon={{ source: Icon.Target, tintColor: Color.Orange }}
                    onAction={() => setFocusedTaskId(task.id)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
