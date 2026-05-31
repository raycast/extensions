import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
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
  return new Date(iso).toLocaleString("ja-JP", { hour12: false });
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
      title: "休憩を終了して停止しますか？",
      message: "現在の休憩セッションを終了し、ループ音を停止します。",
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
      title: "休憩セッションを終了して停止しました",
    });
  }

  if (isLoading) {
    return <Detail isLoading markdown="# Discard Session" />;
  }

  if (!session) {
    return (
      <Detail
        markdown={[
          "# Discard Session",
          "",
          "停止または破棄するセッションがありません。",
        ].join("\n")}
      />
    );
  }

  if (session.kind === "work") {
    return (
      <WorkLogForm
        session={session}
        config={config}
        submitTitle="作業ログを保存して停止"
        successMessage="作業セッションを終了して停止しました。"
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
    "- 現在のセッション種別: 休憩",
    `- 開始時刻: ${formatDateTime(session.startedAt)}`,
    `- 予定終了: ${formatDateTime(session.plannedEndAt)}`,
    "",
    "休憩中にこのコマンドを実行すると、Notion へ保存せずそのままループ音を止めて停止します。",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="休憩を終了して停止"
            icon={Icon.Stop}
            onAction={handleStopBreak}
          />
        </ActionPanel>
      }
    />
  );
}
