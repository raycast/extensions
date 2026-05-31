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
  confirmSessionEnd,
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
import {
  getPomodoroConfig,
  getWorkSessionTypes,
  type PomodoroConfig,
} from "./lib/preferences";
import { syncTimerScheduler } from "./lib/timer-scheduler";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { hour12: false });
}

export default function PomodoroStatusCommand() {
  const [session, setSession] = useState<PomodoroSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(Date.now());
  const { push } = useNavigation();
  const [config, setConfig] = useState<PomodoroConfig>(() =>
    getPomodoroConfig(),
  );
  const [workSessionTypes, setWorkSessionTypes] = useState<string[]>(() =>
    getWorkSessionTypes(),
  );
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

  const snapshot = useMemo(
    () => (session ? getSessionSnapshot(session, tick) : null),
    [session, tick],
  );
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

      const displayAwaiting =
        snapshot?.displayStatus === "awaiting_confirmation";
      const persistedAwaiting = session.status === "awaiting_confirmation";

      if (!displayAwaiting && !persistedAwaiting) {
        awaitingHandledSessionIdRef.current = null;
        return;
      }

      let activeSession = session;

      if (displayAwaiting && !persistedAwaiting) {
        activeSession = confirmSessionEnd(session);
        setSession(activeSession);
        await saveSession(activeSession);
      }

      if (awaitingHandledSessionIdRef.current === activeSession.id) {
        return;
      }

      await stopLoopingAudio();
      await syncTimerScheduler(activeSession);
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
          submitTitle="作業ログを保存して停止"
          successMessage="作業セッションを終了して停止しました。"
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
      title: "休憩を終了して停止しますか？",
      message: "現在の休憩セッションを終了し、ループ音を停止します。",
    });

    if (!confirmed) {
      return;
    }

    await applySessionUpdate(null);
    await showToast({
      style: Toast.Style.Success,
      title: "休憩セッションを終了して停止しました",
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
      title: ok ? "作業音を5秒再生しました" : "作業音が見つかりません",
    });
  }

  async function handlePreviewBreakAudio() {
    const ok = await previewLoopingAudio("break", config, 5);
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "休憩音を5秒再生しました" : "休憩音が見つかりません",
    });
  }

  async function handlePreviewAlarmAudio() {
    const ok = await playAlarm(config);
    await showToast({
      style: ok ? Toast.Style.Success : Toast.Style.Failure,
      title: ok ? "アラーム音を再生しました" : "アラーム音が見つかりません",
    });
  }

  const markdown = useMemo(() => {
    if (!session || !snapshot) {
      return [
        "# Pomodoro Status",
        "",
        "進行中のセッションはありません。ここから新しい作業セッションを開始できます。",
        "",
        "## 現在のタイマー設定",
        "",
        `- 作業: ${config.workMinutes} 分`,
        `- 短休憩: ${config.shortBreakMinutes} 分`,
        `- 長休憩: ${config.longBreakMinutes} 分`,
        `- 長休憩の間隔: ${config.longBreakEvery} セットごと`,
        "",
        "## 作業種類",
        "",
        ...workSessionTypes.map((type) => `- ${type}`),
      ].join("\n");
    }

    const audio = describeAudioSelection(config);
    const availableActions: string[] = [];

    if (effectiveSession?.status === "running") {
      availableActions.push("一時停止");
    }

    if (effectiveSession?.status === "paused") {
      availableActions.push("再開");
    }

    if (
      effectiveSession?.kind === "work" &&
      (effectiveSession?.status === "running" ||
        effectiveSession?.status === "paused")
    ) {
      availableActions.push("今の作業を終了");
    }

    if (
      effectiveSession?.kind !== "work" &&
      (effectiveSession?.status === "running" ||
        effectiveSession?.status === "paused")
    ) {
      availableActions.push("今の休憩を終了");
    }

    if (
      effectiveSession?.status === "awaiting_confirmation" &&
      effectiveSession?.kind === "work"
    ) {
      availableActions.push("作業ログを入力して終了");
    }

    if (
      effectiveSession?.status === "awaiting_confirmation" &&
      effectiveSession?.kind !== "work"
    ) {
      availableActions.push("休憩を終了して次へ進む");
    }

    if (effectiveSession) {
      availableActions.push("セッションを破棄");
    }

    const lines = [
      "# Pomodoro Status",
      "",
      `- 種別: ${getKindLabel(session.kind)}`,
      `- 状態: ${getStatusLabel(snapshot.displayStatus)}`,
      ...(session.kind === "work" && session.workType
        ? [`- 作業種類: ${session.workType}`]
        : []),
      `- 開始時刻: ${formatDateTime(session.startedAt)}`,
      `- 予定終了: ${formatDateTime(session.plannedEndAt)}`,
      `- 完了済み作業セット数: ${session.completedWorkSessions}`,
      "",
    ];

    if (snapshot.displayStatus === "awaiting_confirmation") {
      lines.push(`- 延長時間: ${formatDuration(snapshot.overtimeMs)}`);
    } else if (session.status === "paused") {
      lines.push("- 残り時間の計測は停止中です");
    } else {
      lines.push(`- 残り時間: ${formatDuration(snapshot.remainingMs)}`);
    }

    lines.push(
      "",
      "## 今できること",
      "",
      ...availableActions.map((action) => `- ${action}`),
      "",
      "## 音声設定",
      "",
      `- 作業音: ${audio.work.label}`,
      `- 休憩音: ${audio.break.label}`,
      `- アラーム: ${audio.alarm.label}`,
      "",
      "## 補足",
      "",
      "- 作業音と休憩音はループ再生、アラームは単発再生です。",
      "- 同梱音源は `assets/audio/` に配置すると自動で利用されます。",
      "- 作業中でも `今の作業を終了` でその場でログ入力に進めます。",
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
            <Action
              title="作業種類を選んで開始"
              icon={Icon.Play}
              onAction={() => openStartSessionForm()}
            />
          ) : null}
          {!effectiveSession ? (
            <Action
              title="作業種類を編集"
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
              title="タイマー設定を編集"
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
          (effectiveSession.status === "running" ||
            effectiveSession.status === "paused") ? (
            <Action
              title="今の休憩を終了"
              icon={Icon.CheckCircle}
              onAction={handleFinishBreak}
            />
          ) : null}
          {effectiveSession && effectiveSession.status === "running" ? (
            <Action title="一時停止" icon={Icon.Pause} onAction={handlePause} />
          ) : null}
          {effectiveSession && effectiveSession.status === "paused" ? (
            <Action title="再開" icon={Icon.Play} onAction={handleResume} />
          ) : null}
          {effectiveSession &&
          effectiveSession.kind === "work" &&
          (effectiveSession.status === "running" ||
            effectiveSession.status === "paused") ? (
            <Action
              title="今の作業を終了"
              icon={Icon.Stop}
              onAction={handleFinishWorkNow}
            />
          ) : null}
          {effectiveSession &&
          effectiveSession.status === "awaiting_confirmation" &&
          effectiveSession.kind === "work" ? (
            <Action
              title="作業ログを入力して終了"
              icon={Icon.Pencil}
              onAction={() =>
                push(
                  <WorkLogForm
                    session={effectiveSession}
                    config={config}
                    onCompleted={async (nextSession) => {
                      setSession(nextSession);
                      await syncTimerScheduler(nextSession);
                      await syncAudioForSession(nextSession, config, {
                        force: true,
                      });
                    }}
                  />,
                )
              }
            />
          ) : null}
          {effectiveSession &&
          effectiveSession.status === "awaiting_confirmation" &&
          effectiveSession.kind !== "work" ? (
            <Action
              title="休憩を終了して次へ進む"
              icon={Icon.CheckCircle}
              onAction={handleFinishBreak}
            />
          ) : null}
          {session ? (
            <Action
              title="セッションを破棄"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={handleDiscard}
            />
          ) : null}
          <Action
            title="作業音を試聴"
            icon={Icon.SpeakerOn}
            onAction={handlePreviewWorkAudio}
          />
          <Action
            title="休憩音を試聴"
            icon={Icon.Music}
            onAction={handlePreviewBreakAudio}
          />
          <Action
            title="アラーム音を試聴"
            icon={Icon.Bell}
            onAction={handlePreviewAlarmAudio}
          />
          <Action
            title="状態を更新"
            icon={Icon.ArrowClockwise}
            onAction={refreshSession}
          />
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
