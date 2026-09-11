import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { StartWorkSessionForm } from "./components/start-work-session-form";
import { WorkLogForm } from "./components/work-log-form";
import { syncAudioForSession } from "./lib/audio";
import { loadSession, normalizeRestoredSession, saveSession, type PomodoroSession } from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { hour12: false });
}

export default function FinishCurrentSessionCommand() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const config = useMemo(() => getPomodoroConfig(), []);
  const { push } = useNavigation();

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

  if (isLoading) {
    return <Detail isLoading markdown="# Finish Current Session" />;
  }

  if (!session) {
    return (
      <Detail
        markdown={["# Finish Current Session", "", "No session to finish. Start one from **Start Pomodoro**."].join(
          "\n",
        )}
      />
    );
  }

  if (session.kind === "work") {
    return (
      <WorkLogForm
        session={session}
        config={config}
        submitTitle="Save Work Log and Finish Current Work"
        onCompleted={async (nextSession) => {
          setSession(nextSession);
          await syncTimerScheduler(nextSession);
          await syncAudioForSession(nextSession, config, { force: true });
        }}
      />
    );
  }

  const markdown = [
    "# Finish Current Session",
    "",
    "- Current session type: Break",
    `- Started at: ${formatDateTime(session.startedAt)}`,
    `- Planned end: ${formatDateTime(session.plannedEndAt)}`,
    "",
    "End the current break and continue to the next work session.",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Choose Session Type and Start Next Work"
            icon={Icon.CheckCircle}
            onAction={() =>
              push(
                <StartWorkSessionForm
                  config={config}
                  completedWorkSessions={session.completedWorkSessions}
                  submitTitle="Choose Session Type and Start Next Work"
                  successMessage="Started the next work session."
                  openPomodoroStatusOnComplete
                  onStarted={async () => {
                    setSession(null);
                  }}
                />,
              )
            }
          />
        </ActionPanel>
      }
    />
  );
}
