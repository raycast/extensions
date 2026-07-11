import { Action, ActionPanel, Detail, Icon, openCommandPreferences, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { StartWorkSessionForm } from "./components/start-work-session-form";
import PomodoroStatusCommand from "./pomodoro-status";
import { loadSession } from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";

export default function StartPomodoroCommand() {
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const config = useMemo(() => getPomodoroConfig(), []);
  const { push } = useNavigation();

  useEffect(() => {
    async function checkSession() {
      const session = await loadSession();
      setHasActiveSession(Boolean(session));
      setIsLoading(false);
    }

    checkSession();
  }, []);

  async function handleStarted() {
    setHasActiveSession(true);
  }

  const markdown = useMemo(() => {
    const lines = [
      "# Start Pomodoro",
      "",
      `- Work: ${config.workMinutes} min`,
      `- Short break: ${config.shortBreakMinutes} min`,
      `- Long break: ${config.longBreakMinutes} min`,
      `- Long break every: ${config.longBreakEvery} work sessions`,
      "",
    ];

    if (hasActiveSession) {
      lines.push("A session is already in progress. Check **Pomodoro Status** for details.");
    } else {
      lines.push("You can start a new work session.");
    }

    return lines.join("\n");
  }, [config, hasActiveSession]);

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {!hasActiveSession ? (
            <Action
              title="Choose Session Type and Start"
              icon={Icon.Play}
              onAction={() =>
                push(
                  <StartWorkSessionForm
                    config={config}
                    submitTitle="Choose Session Type and Start"
                    successMessage="Started a new work session."
                    openPomodoroStatusOnComplete
                    onStarted={handleStarted}
                  />,
                )
              }
            />
          ) : null}
          {hasActiveSession ? (
            <Action title="Open Pomodoro Status" icon={Icon.List} onAction={() => push(<PomodoroStatusCommand />)} />
          ) : null}
          <Action title="Open Preferences" icon={Icon.Gear} onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
}
