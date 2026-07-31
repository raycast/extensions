import { Action, ActionPanel, Detail, Icon, openCommandPreferences, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { StartWorkSessionForm } from "./components/start-work-session-form";
import PomodoroStatusCommand from "./pomodoro-status";
import { loadSession } from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";

export default function StartPomodoroCommand() {
  const [hasActiveSession, setHasActiveSession] = useState<boolean | null>(null);
  const config = useMemo(() => getPomodoroConfig(), []);
  const { push } = useNavigation();

  useEffect(() => {
    async function checkSession() {
      const session = await loadSession();
      setHasActiveSession(Boolean(session));
    }

    void checkSession();
  }, []);

  if (hasActiveSession === null) {
    return <Detail isLoading markdown="" />;
  }

  if (hasActiveSession) {
    const markdown = [
      "# Start Pomodoro",
      "",
      "A session is already in progress. Check **Pomodoro Status** for details.",
      "",
      `- Work: ${config.workMinutes} min`,
      `- Short break: ${config.shortBreakMinutes} min`,
      `- Long break: ${config.longBreakMinutes} min`,
      `- Long break every: ${config.longBreakEvery} work sessions`,
    ].join("\n");

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Pomodoro Status" icon={Icon.List} onAction={() => push(<PomodoroStatusCommand />)} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <StartWorkSessionForm
      config={config}
      submitTitle="Choose Session Type and Start"
      successMessage="Started a new work session."
      openPomodoroStatusOnComplete
      onStarted={async () => {
        setHasActiveSession(true);
      }}
    />
  );
}
