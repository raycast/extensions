import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";

import {
  acquireWorkLogFormAudio,
  isWorkLogFormBlockingLoopAudio,
  stopLoopingAudio,
  syncAudioForSession,
} from "../lib/audio";
import { createWorkLogPage } from "../lib/notion";
import {
  clearSession,
  finishSessionAndContinue,
  getActualActiveMinutes,
  loadSession,
  saveSession,
  type PomodoroSession,
} from "../lib/pomodoro-state";
import {
  getNotionSettings,
  type FocusLevel,
  type PomodoroConfig,
} from "../lib/preferences";
import { syncTimerScheduler } from "../lib/timer-scheduler";

type FormValues = {
  note: string;
  focus: FocusLevel;
};

type WorkLogFormProps = {
  session: PomodoroSession;
  config: PomodoroConfig;
  onCompleted: (nextSession: PomodoroSession | null) => Promise<void>;
  submitTitle?: string;
  successMessage?: string;
  createNextSessionOnSubmit?: boolean;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", { hour12: false });
}

export function WorkLogForm(props: WorkLogFormProps) {
  const {
    session,
    config,
    onCompleted,
    submitTitle = "作業ログを保存して休憩へ進む",
    successMessage = "次の休憩セッションへ移行しました。",
    createNextSessionOnSubmit = true,
  } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [focus, setFocus] = useState<FocusLevel>("中");
  const { pop } = useNavigation();
  const submittedRef = useRef(false);

  useEffect(() => {
    const releaseWorkLogAudio = acquireWorkLogFormAudio();

    return () => {
      releaseWorkLogAudio();

      if (submittedRef.current) {
        // 保存して休憩へ進む場合は onCompleted 側で休憩音を鳴らす。ここで止めると休憩音が消える。
        if (!createNextSessionOnSubmit) {
          void stopLoopingAudio();
        }
        return;
      }

      // 保存画面を閉じただけ（未送信）のときは、作業セッションが続いていれば作業音を再開する。
      void (async () => {
        if (isWorkLogFormBlockingLoopAudio()) {
          return;
        }

        const activeSession = await loadSession();
        if (activeSession?.id === session.id) {
          await syncAudioForSession(activeSession, config);
        }
      })();
    };
  }, [config, createNextSessionOnSubmit, session]);

  async function submitWorkLog(values: FormValues) {
    const { notionToken, notionDatabaseId } = getNotionSettings();
    if (!notionToken || !notionDatabaseId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Notion設定が不足しています",
        message: "Token と Database ID を設定してください。",
      });
      return;
    }

    setIsSubmitting(true);
    const endAt = new Date().toISOString();

    try {
      const timeMinutes = getActualActiveMinutes(session, Date.now());

      await createWorkLogPage({
        token: notionToken,
        databaseId: notionDatabaseId,
        session,
        note: values.note.trim(),
        focus: values.focus,
        endAt,
        timeMinutes,
      });

      const nextSession = createNextSessionOnSubmit
        ? finishSessionAndContinue(session, config)
        : null;

      if (nextSession) {
        await saveSession(nextSession);
      } else {
        await clearSession();
      }

      await syncTimerScheduler(nextSession);
      await onCompleted(nextSession);
      await showToast({
        style: Toast.Style.Success,
        title: "作業ログをNotionへ保存しました",
        message: successMessage,
      });
      submittedRef.current = true;
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Notionへの保存に失敗しました",
        message: error instanceof Error ? error.message : "不明なエラー",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    await submitWorkLog(values);
  }

  async function submitWithFocus(focusLevel: FocusLevel) {
    if (isSubmitting) {
      return;
    }

    setFocus(focusLevel);
    await submitWorkLog({ note, focus: focusLevel });
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          <Action
            title="保存（集中度: 高）"
            shortcut={{ modifiers: ["cmd"], key: "1" }}
            onAction={() => void submitWithFocus("高")}
          />
          <Action
            title="保存（集中度: 中）"
            shortcut={{ modifiers: ["cmd"], key: "2" }}
            onAction={() => void submitWithFocus("中")}
          />
          <Action
            title="保存（集中度: 低）"
            shortcut={{ modifiers: ["cmd"], key: "3" }}
            onAction={() => void submitWithFocus("低")}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="セッション情報"
        text={`開始: ${formatDateTime(session.startedAt)}\n予定終了: ${formatDateTime(session.plannedEndAt)}`}
      />
      <Form.Description
        title="集中度のショートカット"
        text="⌘1 ＝ 高で保存 / ⌘2 ＝ 中で保存 / ⌘3 ＝ 低で保存（作業メモはそのまま反映されます）"
      />
      <Form.TextArea
        id="note"
        title="作業メモ"
        placeholder="このセッションで行った作業を入力してください"
        value={note}
        onChange={setNote}
      />
      <Form.Dropdown
        id="focus"
        title="集中度"
        value={focus}
        onChange={(newValue) => setFocus(newValue as FocusLevel)}
      >
        <Form.Dropdown.Item value="高" title="高" />
        <Form.Dropdown.Item value="中" title="中" />
        <Form.Dropdown.Item value="低" title="低" />
      </Form.Dropdown>
    </Form>
  );
}
