import {
  Action,
  ActionPanel,
  Form,
  Keyboard,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { spawn } from "node:child_process";
import { useState } from "react";

import { syncAudioForSession } from "../lib/audio";
import {
  saveSession,
  startWorkSession,
  type PomodoroSession,
} from "../lib/pomodoro-state";
import { getWorkSessionTypes, type PomodoroConfig } from "../lib/preferences";
import {
  buildCommandDeeplink,
  syncTimerScheduler,
} from "../lib/timer-scheduler";
import { WorkSessionTypesForm } from "./work-session-types-form";

const POMODORO_STATUS_COMMAND = "pomodoro-status";
const WORK_TYPE_SHORTCUT_KEYS = ["2", "3", "4", "5"] as const;

function getShortcutWorkTypeSlots(workSessionTypes: string[]) {
  return WORK_TYPE_SHORTCUT_KEYS.flatMap((key, index) => {
    const workType = workSessionTypes[index + 1];
    return workType ? [{ key, workType }] : [];
  });
}

type FormValues = {
  workType: string;
};

type StartWorkSessionFormProps = {
  config: PomodoroConfig;
  completedWorkSessions?: number;
  submitTitle?: string;
  successMessage?: string;
  openPomodoroStatusOnComplete?: boolean;
  onStarted: (session: PomodoroSession) => Promise<void>;
};

export function StartWorkSessionForm(props: StartWorkSessionFormProps) {
  const {
    config,
    completedWorkSessions = 0,
    submitTitle = "作業セッションを開始",
    successMessage = "新しい作業セッションを開始しました。",
    openPomodoroStatusOnComplete = false,
    onStarted,
  } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workSessionTypes, setWorkSessionTypes] = useState<string[]>(() =>
    getWorkSessionTypes(),
  );
  const { pop, push } = useNavigation();

  async function startWithWorkType(workType?: string) {
    if (!workType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "作業種類を選択してください",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const session = startWorkSession(
        config,
        Date.now(),
        workType,
        completedWorkSessions,
      );
      await saveSession(session);
      await syncAudioForSession(session, config);
      await syncTimerScheduler(session);
      await onStarted(session);
      await showToast({
        style: Toast.Style.Success,
        title: successMessage,
        message: `${workType} / ${config.workMinutes}分`,
      });

      if (openPomodoroStatusOnComplete) {
        const child = spawn(
          "open",
          [buildCommandDeeplink(POMODORO_STATUS_COMMAND, "userInitiated")],
          {
            detached: true,
            stdio: "ignore",
          },
        );
        child.unref();
      }

      pop();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    await startWithWorkType(values.workType);
  }

  const shortcutWorkTypeSlots = getShortcutWorkTypeSlots(workSessionTypes);
  const shortcutGuideText =
    shortcutWorkTypeSlots.length > 0
      ? shortcutWorkTypeSlots
          .map(({ key, workType }) => `⌘${key}: ${workType}`)
          .join("\n")
      : "作業種類が 2 つ以上あると、⌘2〜⌘5 で素早く開始できます。";

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {shortcutWorkTypeSlots.map(({ key, workType }) => (
            <Action
              key={key}
              title={`${workType} で開始`}
              shortcut={{ modifiers: ["cmd"], key }}
              onAction={() => startWithWorkType(workType)}
            />
          ))}
          <Action
            title="作業種類を編集"
            shortcut={Keyboard.Shortcut.Common.Edit}
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
        </ActionPanel>
      }
    >
      <Form.Description
        title="反映タイミング"
        text="ここで選ぶ作業種類は、これから開始する作業セッションにだけ反映します。"
      />
      <Form.Dropdown
        id="workType"
        title="作業種類"
        defaultValue={workSessionTypes[0]}
      >
        {workSessionTypes.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type} />
        ))}
      </Form.Dropdown>
      <Form.Description title="ショートカット" text={shortcutGuideText} />
    </Form>
  );
}
