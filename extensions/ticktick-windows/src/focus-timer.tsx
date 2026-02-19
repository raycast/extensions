import {
  Action,
  ActionPanel,
  Color,
  Detail,
  getPreferenceValues,
  Icon,
  List,
  LocalStorage,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { FocusSession, Preferences } from "./types";
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
  onComplete,
  onReset,
}: {
  session: FocusSession;
  durations: Record<FocusSession["type"], number>;
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
    ``,
    // Large code block makes the digits visually dominant and monospace-wide
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
            onAction={onReset}
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

  const [session, setSession] = useState<FocusSession | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    LocalStorage.getItem<string>(FOCUS_SESSION_KEY).then((raw) => {
      if (raw) {
        try {
          const s: FocusSession = JSON.parse(raw);
          const elapsed = Math.floor((Date.now() - s.startTime) / 1000);
          if (elapsed < s.duration * 60) {
            setSession(s);
          } else {
            LocalStorage.removeItem(FOCUS_SESSION_KEY);
          }
        } catch {
          // ignore
        }
      }
      setLoaded(true);
    });
  }, []);

  function startSession(type: FocusSession["type"], sessionsCompleted: number) {
    const s: FocusSession = {
      startTime: Date.now(),
      duration: durations[type],
      type,
      sessionsCompleted,
    };
    setSession(s);
    LocalStorage.setItem(FOCUS_SESSION_KEY, JSON.stringify(s));
  }

  function handleSessionComplete() {
    if (!session) return;
    if (session.type === "focus") {
      const count = session.sessionsCompleted + 1;
      startSession(count % 4 === 0 ? "longBreak" : "shortBreak", count);
    } else {
      startSession("focus", session.sessionsCompleted);
    }
  }

  function resetTimer() {
    setSession(null);
    LocalStorage.removeItem(FOCUS_SESSION_KEY);
  }

  // Show the Detail skeleton while restoring from storage so there's no flash
  // between List and Detail on open.
  if (!loaded) return <Detail isLoading markdown="" />;

  if (session) {
    return (
      <TimerView
        session={session}
        durations={durations}
        onComplete={handleSessionComplete}
        onReset={resetTimer}
      />
    );
  }

  const sessionTypes: Array<FocusSession["type"]> = [
    "focus",
    "shortBreak",
    "longBreak",
  ];

  return (
    <List navigationTitle="Focus Timer">
      <List.Section title="Start a Session" subtitle="Choose your session type">
        {sessionTypes.map((type) => {
          const config = SESSION_CONFIG[type];
          const duration = durations[type];
          return (
            <List.Item
              key={type}
              title={config.label}
              subtitle={config.description}
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
                    onAction={() => startSession(type, 0)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
