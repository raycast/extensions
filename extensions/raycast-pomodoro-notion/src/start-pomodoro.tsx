import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  openCommandPreferences,
  useNavigation,
} from "@raycast/api";
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
      `- 作業: ${config.workMinutes} 分`,
      `- 短休憩: ${config.shortBreakMinutes} 分`,
      `- 長休憩: ${config.longBreakMinutes} 分`,
      `- 長休憩の間隔: ${config.longBreakEvery} セットごと`,
      "",
    ];

    if (hasActiveSession) {
      lines.push(
        "進行中のセッションがあります。`Pomodoro Status` から状態を確認してください。",
      );
    } else {
      lines.push("新しい作業セッションを開始できます。");
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
              title="作業種類を選んで開始"
              icon={Icon.Play}
              onAction={() =>
                push(
                  <StartWorkSessionForm
                    config={config}
                    submitTitle="作業種類を選んで開始"
                    successMessage="新しい作業セッションを開始しました。"
                    openPomodoroStatusOnComplete
                    onStarted={handleStarted}
                  />,
                )
              }
            />
          ) : null}
          {hasActiveSession ? (
            <Action
              title="Pomodoro Status を開く"
              icon={Icon.List}
              onAction={() => push(<PomodoroStatusCommand />)}
            />
          ) : null}
          <Action
            title="設定を開く"
            icon={Icon.Gear}
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
