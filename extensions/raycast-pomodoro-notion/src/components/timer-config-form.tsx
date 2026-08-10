import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";

import { getPomodoroConfig, savePomodoroConfigOverrides } from "../lib/preferences";

type FormValues = {
  workMinutes: string;
  shortBreakMinutes: string;
  longBreakMinutes: string;
  longBreakEvery: string;
};

type TimerConfigFormProps = {
  onSaved: (config: ReturnType<typeof getPomodoroConfig>) => Promise<void>;
};

export function TimerConfigForm(props: TimerConfigFormProps) {
  const { onSaved } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentConfig = getPomodoroConfig();
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const workMinutes = Number.parseInt(values.workMinutes, 10);
    const shortBreakMinutes = Number.parseInt(values.shortBreakMinutes, 10);
    const longBreakMinutes = Number.parseInt(values.longBreakMinutes, 10);
    const longBreakEvery = Number.parseInt(values.longBreakEvery, 10);

    if (
      !Number.isFinite(workMinutes) ||
      workMinutes <= 0 ||
      !Number.isFinite(shortBreakMinutes) ||
      shortBreakMinutes <= 0 ||
      !Number.isFinite(longBreakMinutes) ||
      longBreakMinutes <= 0 ||
      !Number.isFinite(longBreakEvery) ||
      longBreakEvery <= 0
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Enter positive integers",
        message: "Work, break, and long-break interval values must be 1 or greater.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await savePomodoroConfigOverrides({
        workMinutes,
        shortBreakMinutes,
        longBreakMinutes,
        longBreakEvery,
      });

      const updatedConfig = getPomodoroConfig();
      await onSaved(updatedConfig);
      await showToast({
        style: Toast.Style.Success,
        title: "Timer settings updated",
        message: "Changes apply to the next session you start.",
      });
      pop();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Timer Settings" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="When this applies"
        text="These values do not change the current session. They apply to the next session you start."
      />
      <Form.TextField id="workMinutes" title="Work (minutes)" defaultValue={String(currentConfig.workMinutes)} />
      <Form.TextField
        id="shortBreakMinutes"
        title="Short Break (minutes)"
        defaultValue={String(currentConfig.shortBreakMinutes)}
      />
      <Form.TextField
        id="longBreakMinutes"
        title="Long Break (minutes)"
        defaultValue={String(currentConfig.longBreakMinutes)}
      />
      <Form.TextField
        id="longBreakEvery"
        title="Long Break Every (work sessions)"
        defaultValue={String(currentConfig.longBreakEvery)}
      />
    </Form>
  );
}
