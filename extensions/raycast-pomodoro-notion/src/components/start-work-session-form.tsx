import { Action, ActionPanel, Form, Keyboard, Toast, showToast, useNavigation } from "@raycast/api";
import { spawn } from "node:child_process";
import { useState } from "react";

import { syncAudioForSession } from "../lib/audio";
import { saveSession, startWorkSession, type PomodoroSession } from "../lib/pomodoro-state";
import { getWorkSessionTypes, type PomodoroConfig } from "../lib/preferences";
import { buildCommandDeeplink, syncTimerScheduler } from "../lib/timer-scheduler";
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
    submitTitle = "Start Work Session",
    successMessage = "Started a new work session.",
    openPomodoroStatusOnComplete = false,
    onStarted,
  } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workSessionTypes, setWorkSessionTypes] = useState<string[]>(() => getWorkSessionTypes());
  const { pop, push } = useNavigation();

  async function startWithWorkType(workType?: string) {
    if (!workType) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Select a work session type",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const session = startWorkSession(config, Date.now(), workType, completedWorkSessions);
      await saveSession(session);
      await syncAudioForSession(session, config);
      await syncTimerScheduler(session);
      await onStarted(session);
      await showToast({
        style: Toast.Style.Success,
        title: successMessage,
        message: `${workType} / ${config.workMinutes} min`,
      });

      if (openPomodoroStatusOnComplete) {
        const child = spawn("open", [buildCommandDeeplink(POMODORO_STATUS_COMMAND, "userInitiated")], {
          detached: true,
          stdio: "ignore",
        });
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
      ? shortcutWorkTypeSlots.map(({ key, workType }) => `⌘${key}: ${workType}`).join("\n")
      : "Add at least two work session types to use ⌘2 through ⌘5 shortcuts.";

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={handleSubmit} />
          {shortcutWorkTypeSlots.map(({ key, workType }) => (
            <Action
              key={key}
              title={`Start: ${workType}`}
              shortcut={{ modifiers: ["cmd"], key }}
              onAction={() => startWithWorkType(workType)}
            />
          ))}
          <Action
            title="Edit Work Session Types"
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
        title="When this applies"
        text="The work session type you choose here applies only to the session you are about to start."
      />
      <Form.Dropdown id="workType" title="Work Session Type" defaultValue={workSessionTypes[0]}>
        {workSessionTypes.map((type) => (
          <Form.Dropdown.Item key={type} value={type} title={type} />
        ))}
      </Form.Dropdown>
      <Form.Description title="Shortcuts" text={shortcutGuideText} />
    </Form>
  );
}
