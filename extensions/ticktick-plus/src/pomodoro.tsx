import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { usePomodoro } from "./hooks/usePomodoro";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { PomodoroPhase } from "./lib/pomodoro-state";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function Pomodoro() {
  useAlerts();
  const { data: syncData } = useSync();
  const { state, remaining, todayCount, isLoading, start, startPhase, pause, resume, reset, skip, formatTime } =
    usePomodoro();

  const phaseLabels: Record<PomodoroPhase, string> = {
    idle: "Ready to Focus",
    work: "🍅 Focus",
    short_break: "☕ Short Break",
    long_break: "🌿 Long Break",
  };

  const phaseColors: Record<PomodoroPhase, Color> = {
    idle: Color.SecondaryText,
    work: Color.Red,
    short_break: Color.Green,
    long_break: Color.Blue,
  };

  const todayTasks = syncData.tasks.filter((t) => t.dueDate).slice(0, 20);

  return (
    <List navigationTitle="Pomodoro Timer" searchBarPlaceholder="Search tasks to focus on..." isLoading={isLoading}>
      <List.Section title="Timer">
        <List.Item
          icon={{ source: Icon.Clock, tintColor: phaseColors[state.phase] }}
          title={formatTime(remaining)}
          subtitle={
            state.linkedTaskTitle ? `${phaseLabels[state.phase]} · ${state.linkedTaskTitle}` : phaseLabels[state.phase]
          }
          accessories={[
            { text: `Session ${state.sessionCount + 1}` },
            state.isRunning
              ? { text: "Running", icon: { source: Icon.Play, tintColor: Color.Green } }
              : { text: "Paused", icon: { source: Icon.Pause, tintColor: Color.SecondaryText } },
            state.ticktickSynced
              ? { text: "Synced", icon: { source: Icon.Link, tintColor: Color.Green } }
              : { text: "Local", icon: { source: Icon.Circle, tintColor: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Timer Controls">
                {!state.isRunning ? (
                  <Action
                    title={state.phase === "idle" ? "Start Focus Session" : "Resume"}
                    icon={Icon.Play}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={() => (state.phase === "idle" ? start() : resume())}
                  />
                ) : (
                  <Action
                    title="Pause"
                    icon={Icon.Pause}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                    onAction={pause}
                  />
                )}
                <Action
                  title="Skip Phase"
                  icon={Icon.Forward}
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  onAction={skip}
                />
                <Action
                  title="Reset Timer"
                  icon={Icon.ArrowCounterClockwise}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                  onAction={reset}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Schedule">
        {(["work", "short_break", "long_break"] as PomodoroPhase[]).map((phase) => {
          const labels: Record<PomodoroPhase, string> = {
            idle: "",
            work: "🍅 Focus — 25 min",
            short_break: "☕ Short Break — 5 min",
            long_break: "🌿 Long Break — 15 min",
          };
          const colors: Record<PomodoroPhase, Color> = {
            idle: Color.SecondaryText,
            work: Color.Red,
            short_break: Color.Green,
            long_break: Color.Blue,
          };
          return (
            <List.Item
              key={phase}
              icon={{ source: Icon.Circle, tintColor: colors[phase] }}
              title={labels[phase]}
              accessories={[{ text: state.phase === phase ? "Current" : "" }]}
              actions={
                <ActionPanel>
                  <Action title="Start" onAction={() => startPhase(phase)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {todayTasks.length > 0 && (
        <List.Section title="Focus on a Task">
          {todayTasks.map((task) => (
            <List.Item
              key={task.id}
              icon={Icon.Pin}
              title={task.title}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Pomodoro on This Task"
                    icon={Icon.Play}
                    onAction={() => start(task.id, task.projectId, task.title)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Sessions Today">
        <List.Item
          icon={Icon.BarChart}
          title={`${todayCount} session${todayCount !== 1 ? "s" : ""} in TickTick`}
          subtitle={
            state.sessionCount > 0
              ? `${formatDuration(state.sessionCount * state.workDurationSec)} focused this session`
              : "Start your first session"
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="View Full History in TickTick" url="https://ticktick.com/webapp/#p/focus" />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
