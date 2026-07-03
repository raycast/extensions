import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  openCommandPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useRef, useState } from "react";

import { TimerConfigForm } from "./components/timer-config-form";
import { StartWorkSessionForm } from "./components/start-work-session-form";
import { WorkSessionTypesForm } from "./components/work-session-types-form";
import { WorkLogForm } from "./components/work-log-form";
import {
  describeAudioSelection,
  isWorkLogFormBlockingLoopAudio,
  playAlarm,
  playAlarmForSession,
  previewLoopingAudio,
  stopLoopingAudio,
  syncAudioForSession,
} from "./lib/audio";
import {
  clearSession,
  getStatusLabel,
  formatDuration,
  getKindLabel,
  getSessionSnapshot,
  loadSession,
  normalizeRestoredSession,
  pauseSession,
  resumeSession,
  saveSession,
  type PomodoroSession,
} from "./lib/pomodoro-state";
import { getPomodoroConfig, getWorkSessionTypes, type PomodoroConfig } from "./lib/preferences";
import { cancelTimerScheduler, syncTimerScheduler } from "./lib/timer-scheduler";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { hour12: false });
}

export default function PomodoroStatusCommand() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(Date.now());
  const { push } = useNavigation();
  const [config, setConfig] = useState<PomodoroConfig>(() => getPomodoroConfig());
  const [workSessionTypes, setWorkSessionTypes] = useState<string[]>(() => getWorkSessionTypes());
  const lastTickRef = useRef<number>(Date.now());
  const awaitingHandledSessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    async function initialize() {
      const loaded = await loadSession();
      const normalized = loaded ? normalizeRestoredSession(loaded) : null;
      if (normalized && loaded && normalized.status !== loaded.status) {
        await saveSession(normalized);
      }

      setSession(normalized);
      await syncAudioForSession(normalized, config);
      await syncTimerScheduler(normalized);
      setIsLoading(false);
    }

    initialize();
  }, [config]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      lastTickRef.current = now;
      setTick(now);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const snapshot = useMemo(() => (session ? getSessionSnapshot(session, tick) : null), [session, tick]);
  const effectiveSession = snapshot?.session ?? session;

  useEffect(() => {
    async function handleAwaitingConfirmation() {
      if (!session) {
        awaitingHandledSessionIdRef.current = null;
        return;
      }

      if (isWorkLogFormBlockingLoopAudio()) {
        return;
      }

      const displayAwaiting = snapshot?.displayStatus === "awaiting_confirmation";
      const persistedAwaiting = session.status === "awaiting_confirmation";

      if (!displayAwaiting && !persistedAwaiting) {
        awaitingHandledSessionIdRef.current = null;
        return;
      }

      const activeSession = session;

      if (awaitingHandledSessionIdRef.current === activeSession.id) {
        return;
      }

      await stopLoopingAudio();
      await cancelTimerScheduler();
      await playAlarmForSession(activeSession.id, config);
      awaitingHandledSessionIdRef.current = activeSession.id;
    }

    void handleAwaitingConfirmation();
  }, [config, snapshot, session]);

  async function applySessionUpdate(updated: PomodoroSession | null) {
    if (updated) {
      await saveSession(updated);
    } else {
      await clearSession();
    }

    await syncAudioForSession(updated, config);
    await syncTimerScheduler(updated);
    setSession(updated);
  }

  async function refreshSession() {
    const loaded = await loadSession();
    const normalized = loaded ? normalizeRestoredSession(loaded) : null;
    if (normalized && loaded && normalized.status !== loaded.status) {
      await saveSession(normalized);
    }

    setSession(normalized);
    await syncAudioForSession(normalized, config);
    await syncTimerScheduler(normalized);
  }

  function openStartSessionForm(completedWorkSessions = 0) {
    push(
      <StartWorkSessionForm
        config={config}
        completedWorkSessions={completedWorkSessions}
        onStarted={async (started) => {
          setSession(started);
        }}
      />,
    );
  }

  async function handlePause() {
    if (!session) {
      return;
    }

    const updated = pauseSession(session);
    await applySessionUpdate(updated);
  }

  async function handleResume() {
    if (!session) {
      return;
    }

    const updated = resumeSession(session);
    if (updated.status !== "running") {
      await applySessionUpdate(updated);
      return;
    }

    await saveSession(updated);
    await syncAudioForSession(updated, config, { restart: true });
    await syncTimerScheduler(updated);
    setSession(updated);
  }

  async function handleDiscard() {
    if (!session) {
      return;
    }

    if (session.kind === "work") {
      push(
        <WorkLogForm
          session={session}
          config={config}
          submitTitle="Save Work Log and Stop"
          successMessage="Work session ended and stopped."
          createNextSessionOnSubmit={false}
          onCompleted={async () => {
            await stopLoopingAudio();
            await syncTimerScheduler(null);
            setSession(null);
          }}
        />,
      );
      return;
    }

    const confirmed = await confirmAlert({
      title: "End break and stop?",
      message: "This ends the current break session and stops looping audio.",
    });

    if (!confirmed) {
      return;
    }

    await applySessionUpdate(null);
    await showToast({
      style: Toast.Style.Success,
      title: "Break session ended and stopped",
    });
  }

  async function handleFinishBreak() {
    if (!session) {
      return;
    }
    openStartSessionForm(session.completedWorkSessions);
  }

  function handleFinishWorkNow() {
    if (!session) {
      return;
    }

    push(
      <WorkLogForm
        session={session}
        config={config}
        onCompleted={async (nextSession) => {
          setSession(nextSession);
          await syncTimerScheduler(nextSession);
          await syncAudioForSession(nextSession, config, { force: true });
        }}
      />,
    );
  }

  async function handlePreviewWorkAudio() {
    const ok = await previewLoopingAudio("work", config, 5);
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "Played work audio for 5 seconds" : "Work audio not found",
    });
  }

  async function handlePreviewBreakAudio() {
    const ok = await previewLoopingAudio("break", config, 5);
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "Played break audio for 5 seconds" : "Break audio not found",
    });
  }

  async function handlePreviewAlarmAudio() {
    const ok = await playAlarm(config);
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "Played alarm audio" : "Alarm audio not found",
    });
  }

  const markdown = useMemo(() => {
    if (!session || !snapshot) {
      return [
        "# PomoNotion Status",
        "",
        "No active session. Start a new work session from here.",
        "",
        "## Current Timer Settings",
        "",
        `- Work: ${config.workMinutes} min`,
        `- Short break: ${config.shortBreakMinutes} min`,
        `- Long break: ${config.longBreakMinutes} min`,
        `- Long break every: ${config.longBreakEvery} work sessions`,
        "",
        "## Session Types",
        "",
        ...workSessionTypes.map((type) => `- ${type}`),
      ].join("\n");
    }

    const audio = describeAudioSelection(config);
    const availableActions: string[] = [];

    if (effectiveSession?.status === "running") {
      availableActions.push("Pause");
    }

    if (effectiveSession?.status === "paused") {
      availableActions.push("Resume");
    }

    if (
      effectiveSession?.kind === "work" &&
      (effectiveSession?.status === "running" || effectiveSession?.status === "paused")
    ) {
      availableActions.push("Finish Current Work");
    }

    if (
      effectiveSession?.kind !== "work" &&
      (effectiveSession?.status === "running" || effectiveSession?.status === "paused")
    ) {
      availableActions.push("Finish Current Break");
    }

    if (effectiveSession?.status === "awaiting_confirmation" && effectiveSession?.kind === "work") {
      availableActions.push("Enter Work Log and Finish");
    }

    if (effectiveSession?.status === "awaiting_confirmation" && effectiveSession?.kind !== "work") {
      availableActions.push("Finish Break and Continue");
    }

    if (effectiveSession) {
      availableActions.push("Discard Session");
    }

    const lines = [
      "# PomoNotion Status",
      "",
      `- Type: ${getKindLabel(session.kind)}`,
      `- Status: ${getStatusLabel(snapshot.displayStatus)}`,
      ...(session.kind === "work" && session.workType ? [`- Session type: ${session.workType}`] : []),
      `- Started at: ${formatDateTime(session.startedAt)}`,
      `- Planned end: ${formatDateTime(session.plannedEndAt)}`,
      `- Completed work sessions: ${session.completedWorkSessions}`,
      "",
    ];

    if (snapshot.displayStatus === "awaiting_confirmation") {
      lines.push(`- Overtime: ${formatDuration(snapshot.overtimeMs)}`);
    } else if (session.status === "paused") {
      lines.push("- Remaining time is frozen while paused");
    } else {
      lines.push(`- Remaining: ${formatDuration(snapshot.remainingMs)}`);
    }

    lines.push(
      "",
      "## Available Actions",
      "",
      ...availableActions.map((action) => `- ${action}`),
      "",
      "## Audio",
      "",
      `- Work audio: ${audio.work.label}`,
      `- Break audio: ${audio.break.label}`,
      `- Alarm: ${audio.alarm.label}`,
      "",
      "## Notes",
      "",
      "- Work and break audio loop; the alarm plays once.",
      "- Bundled audio in `assets/audio/` is used automatically when present.",
      "- During work, use **Finish Current Work** to enter your work log immediately.",
    );

    return lines.join("\n");
  }, [config, effectiveSession, session, snapshot, workSessionTypes]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!effectiveSession ? (
            <Action title="Choose Session Type and Start" icon={Icon.Play} onAction={() => openStartSessionForm()} />
          ) : null}
          {!effectiveSession ? (
            <Action
              title="Edit Session Types"
              icon={Icon.List}
              onAction={() =>
                push(
                  <WorkSessionTypesForm
                    onSaved={async (types) => {
                      setWorkSessionTypes(types);
                    }}
                  />,
                )
              }
            />
          ) : null}
          {!effectiveSession ? (
            <Action
              title="Edit Timer Settings"
              icon={Icon.Pencil}
              onAction={() =>
                push(
                  <TimerConfigForm
                    onSaved={async (updatedConfig) => {
                      setConfig(updatedConfig);
                    }}
                  />,
                )
              }
            />
          ) : null}
          {effectiveSession &&
          effectiveSession.kind !== "work" &&
          (effectiveSession.status === "running" || effectiveSession.status === "paused") ? (
            <Action title="Finish Current Break" icon={Icon.CheckCircle} onAction={handleFinishBreak} />
          ) : null}
          {effectiveSession && effectiveSession.status === "running" ? (
            <Action title="Pause" icon={Icon.Pause} onAction={handlePause} />
          ) : null}
          {effectiveSession && effectiveSession.status === "paused" ? (
            <Action title="Resume" icon={Icon.Play} onAction={handleResume} />
          ) : null}
          {effectiveSession &&
          effectiveSession.kind === "work" &&
          (effectiveSession.status === "running" || effectiveSession.status === "paused") ? (
            <Action title="Finish Current Work" icon={Icon.Stop} onAction={handleFinishWorkNow} />
          ) : null}
          {effectiveSession &&
          effectiveSession.status === "awaiting_confirmation" &&
          effectiveSession.kind === "work" ? (
            <Action
              title="Enter Work Log and Finish"
              icon={Icon.Pencil}
              onAction={() => {
                if (!session) {
                  return;
                }

                push(
                  <WorkLogForm
                    session={session}
                    config={config}
                    onCompleted={async (nextSession) => {
                      setSession(nextSession);
                      await syncTimerScheduler(nextSession);
                      await syncAudioForSession(nextSession, config, {
                        force: true,
                      });
                    }}
                  />,
                );
              }}
            />
          ) : null}
          {effectiveSession &&
          effectiveSession.status === "awaiting_confirmation" &&
          effectiveSession.kind !== "work" ? (
            <Action title="Finish Break and Continue" icon={Icon.CheckCircle} onAction={handleFinishBreak} />
          ) : null}
          {session ? (
            <Action
              title="Discard Session"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDiscard}
            />
          ) : null}
          <Action title="Preview Work Audio" icon={Icon.SpeakerOn} onAction={handlePreviewWorkAudio} />
          <Action title="Preview Break Audio" icon={Icon.Music} onAction={handlePreviewBreakAudio} />
          <Action title="Preview Alarm Audio" icon={Icon.Bell} onAction={handlePreviewAlarmAudio} />
          <Action title="Refresh Status" icon={Icon.ArrowClockwise} onAction={refreshSession} />
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
