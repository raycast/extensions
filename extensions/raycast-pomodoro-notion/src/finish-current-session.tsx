import { Action, ActionPanel, Detail, Icon, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import { StartWorkSessionForm } from "./components/start-work-session-form";
import { WorkLogForm } from "./components/work-log-form";
import { syncAudioForSession } from "./lib/audio";
import {
  loadSession,
  normalizeRestoredSession,
  saveSession,
  type PomodoroSession,
} from "./lib/pomodoro-state";
import { getPomodoroConfig } from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { hour12: false });
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
        markdown={[
          "# Finish Current Session",
          "",
          "終了するセッションがありません。`Start Pomodoro` から開始してください。",
        ].join("\n")}
      />
    );
  }

  if (session.kind === "work") {
    return (
      <WorkLogForm
        session={session}
        config={config}
        submitTitle="作業ログを保存して現在の作業を終了"
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
    "- 現在のセッション種別: 休憩",
    `- 開始時刻: ${formatDateTime(session.startedAt)}`,
    `- 予定終了: ${formatDateTime(session.plannedEndAt)}`,
    "",
    "現在の休憩を終了して、次の作業セッションへ進みます。",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="作業種類を選んで次の作業を開始"
            icon={Icon.CheckCircle}
            onAction={() =>
              push(
                <StartWorkSessionForm
                  config={config}
                  completedWorkSessions={session.completedWorkSessions}
                  submitTitle="作業種類を選んで次の作業を開始"
                  successMessage="次の作業セッションを開始しました。"
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
