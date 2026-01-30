import { Action, ActionPanel, Color, Detail, Icon, showHUD } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import {
  PomodoroState,
  SessionType,
  DURATIONS,
  LABELS,
  loadState,
  persistState,
  clearState,
  computeRemaining,
  formatTime,
  playCompletionSound,
  playSpotify,
  pauseSpotify,
} from "./pomodoro-state";

export default function Pomodoro() {
  const [state, setState] = useState<PomodoroState | null>(null);
  const [remaining, setRemaining] = useState(DURATIONS.work);
  const [loaded, setLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load persisted state on mount
  useEffect(() => {
    loadState().then((s) => {
      if (s) {
        setState(s);
        setRemaining(computeRemaining(s));
      }
      setLoaded(true);
    });
  }, []);

  // Tick every second when running
  useEffect(() => {
    if (state?.isRunning) {
      intervalRef.current = setInterval(() => {
        const r = computeRemaining(state);
        setRemaining(r);
        if (r <= 0) {
          clearInterval(intervalRef.current!);
          const finished: PomodoroState = {
            ...state,
            isRunning: false,
            remainingAtStart: 0,
            sessionsCompleted: state.sessionType === "work" ? state.sessionsCompleted + 1 : state.sessionsCompleted,
          };
          setState(finished);
          persistState(finished);
          playCompletionSound();
          pauseSpotify();
          if (state.sessionType === "work") {
            showHUD("Focus session complete! Time for a break.");
          } else {
            showHUD("Break over! Ready to focus.");
          }
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state]);

  async function start(type: SessionType, sessions?: number) {
    const s: PomodoroState = {
      sessionType: type,
      startedAt: Date.now(),
      remainingAtStart: DURATIONS[type],
      isRunning: true,
      sessionsCompleted: sessions ?? state?.sessionsCompleted ?? 0,
      soundPlayed: false,
    };
    setState(s);
    setRemaining(DURATIONS[type]);
    await persistState(s);
    if (type === "work") playSpotify();
  }

  async function pause() {
    if (!state) return;
    const s: PomodoroState = { ...state, isRunning: false, remainingAtStart: computeRemaining(state) };
    setState(s);
    setRemaining(s.remainingAtStart);
    await persistState(s);
    pauseSpotify();
  }

  async function resume() {
    if (!state) return;
    const s: PomodoroState = { ...state, isRunning: true, startedAt: Date.now() };
    setState(s);
    await persistState(s);
    if (state.sessionType === "work") playSpotify();
  }

  async function reset() {
    await clearState();
    setState(null);
    setRemaining(DURATIONS.work);
  }

  if (!loaded) return <Detail isLoading />;

  const sessionType = state?.sessionType ?? "work";
  const isRunning = state?.isRunning ?? false;
  const isDone = state != null && remaining === 0 && !isRunning;
  const hasState = state != null;
  const sessionsCompleted = state?.sessionsCompleted ?? 0;

  const total = DURATIONS[sessionType];
  const progress = hasState ? 1 - remaining / total : 0;
  const pct = Math.round(progress * 100);

  // Visual progress bar — wider for more resolution
  const barLength = 30;
  const filled = Math.round(progress * barLength);
  const progressBar = "▓".repeat(filled) + "░".repeat(barLength - filled);

  const status = !hasState ? "Ready" : isRunning ? "Running" : isDone ? "Complete" : "Paused";
  const statusIcon = !hasState ? "⏳" : isRunning ? "▶" : isDone ? "✓" : "⏸";

  // Minutes and seconds display for the markdown hero area
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  const markdown = hasState
    ? `
# ${statusIcon}  ${formatTime(remaining)}

\`\`\`
${progressBar}  ${pct}%
\`\`\`

${isDone ? (sessionType === "work" ? "**Session complete.** Start a break or reset." : "**Break over.** Ready to focus again.") : ""}
`
    : `
# ⏳  ${formatTime(DURATIONS.work)}

Ready to start a focus session.

---

*Press Enter to begin · ⌘1 Focus · ⌘2 Break*
`;

  const sessionColor = sessionType === "work" ? Color.Red : Color.Green;
  const statusColor = isDone ? Color.Orange : isRunning ? Color.Green : Color.SecondaryText;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Session">
            <Detail.Metadata.TagList.Item text={LABELS[sessionType]} color={sessionColor} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={status} color={statusColor} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Time Remaining" text={`${mins}m ${secs.toString().padStart(2, "0")}s`} />
          <Detail.Metadata.Label title="Duration" text={`${total / 60} min`} />
          <Detail.Metadata.Label title="Progress" text={`${pct}%`} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Label title="Sessions Completed" text={`${sessionsCompleted}`} icon={Icon.Checkmark} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.TagList title="Spotify">
            <Detail.Metadata.TagList.Item
              text={isRunning && sessionType === "work" ? "Playing" : "Paused"}
              color={isRunning && sessionType === "work" ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Timer">
            {isDone ? (
              sessionType === "work" ? (
                <Action title="Start Break" icon={Icon.Clock} onAction={() => start("break")} />
              ) : (
                <Action title="Start Focus" icon={Icon.Play} onAction={() => start("work")} />
              )
            ) : isRunning ? (
              <Action title="Pause" icon={Icon.Pause} onAction={pause} />
            ) : hasState ? (
              <Action title="Resume" icon={Icon.Play} onAction={resume} />
            ) : (
              <Action title="Start Focus" icon={Icon.Play} onAction={() => start("work")} />
            )}
            {hasState && (
              <Action
                title="Reset"
                icon={Icon.ArrowCounterClockwise}
                onAction={reset}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Quick Start">
            <Action
              title="25 Min Focus"
              icon={Icon.Clock}
              onAction={() => start("work")}
              shortcut={{ modifiers: ["cmd"], key: "1" }}
            />
            <Action
              title="5 Min Break"
              icon={Icon.Clock}
              onAction={() => start("break")}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
