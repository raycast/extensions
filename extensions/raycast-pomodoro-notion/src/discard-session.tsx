import { Action, ActionPanel, Detail, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { WorkLogForm } from "./components/work-log-form";
import { stopLoopingAudio } from "./lib/audio";
import {
  clearSession,
  loadSession,
  normalizeRestoredSession,
  saveSession,
  type PomodoroSession,
} from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { hour12: false });
}

export default function DiscardSessionCommand() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const config = useMemo(() => getPomodoroConfig(), []);

  useEffect(() => {
    async function initialize() {
      const loaded = await loadSession();
      const normalized = loaded ? normalizeRestoredSession(loaded) : null;
      if (normalized && loaded && normalized.status !== loaded.status) {
        await saveSession(normalized);
      }

      setSession(normalized);
      setIsLoading(false);
    }

    initialize();
  }, []);

  async function handleStopBreak() {
    const confirmed = await confirmAlert({
      title: "End break and stop?",
      message: "This ends the current break session and stops looping audio.",
    });

    if (!confirmed) {
      return;
    }

    await clearSession();
    await stopLoopingAudio();
    await syncTimerScheduler(null);
    setSession(null);
    await showToast({
      style: Toast.Style.Success,
      title: "Break session ended and stopped",
    });
  }

  if (isLoading) {
    return <Detail isLoading markdown="# Discard Session" />;
  }

  if (!session) {
    return <Detail markdown={["# Discard Session", "", "No session to stop or discard."].join("\n")} />;
  }

  if (session.kind === "work") {
    return (
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
      />
    );
  }

  const markdown = [
    "# Discard Session",
    "",
    "- Current session type: Break",
    `- Started at: ${formatDateTime(session.startedAt)}`,
    `- Planned end: ${formatDateTime(session.plannedEndAt)}`,
    "",
    "During a break, this command stops looping audio without saving anything to Notion.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="End Break and Stop" icon={Icon.Stop} onAction={handleStopBreak} />
        </ActionPanel>
      }
    />
  );
}
