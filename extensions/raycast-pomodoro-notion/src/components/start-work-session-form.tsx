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

  const secondWorkType = workSessionTypes[1];
  const thirdWorkType = workSessionTypes[2];
  const fourthWorkType = workSessionTypes[3];

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {secondWorkType ? (
            <Action
              title={`2番目の種類で開始: ${secondWorkType}`}
              shortcut={{ modifiers: ["cmd"], key: "2" }}
              onAction={() => startWithWorkType(secondWorkType)}
            />
          ) : null}
          {thirdWorkType ? (
            <Action
              title={`3番目の種類で開始: ${thirdWorkType}`}
              shortcut={{ modifiers: ["cmd"], key: "3" }}
              onAction={() => startWithWorkType(thirdWorkType)}
            />
          ) : null}
          {fourthWorkType ? (
            <Action
              title={`4番目の種類で開始: ${fourthWorkType}`}
              shortcut={{ modifiers: ["cmd"], key: "4" }}
              onAction={() => startWithWorkType(fourthWorkType)}
            />
          ) : null}
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
    </Form>
  );
}
