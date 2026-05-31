import {
  Action,
  ActionPanel,
  Form,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";

import {
  getPomodoroConfig,
  savePomodoroConfigOverrides,
  type PomodoroConfig,
} from "../lib/preferences";

type FormValues = {
  workMinutes: string;
  shortBreakMinutes: string;
  longBreakMinutes: string;
  longBreakEvery: string;
};

type TimerConfigFormProps = {
  onSaved: (config: PomodoroConfig) => Promise<void>;
};

function isPositiveInteger(value: string): boolean {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0;
}

export function TimerConfigForm(props: TimerConfigFormProps) {
  const { onSaved } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { pop } = useNavigation();
  const currentConfig = getPomodoroConfig();

  async function handleSubmit(values: FormValues) {
    if (
      !isPositiveInteger(values.workMinutes) ||
      !isPositiveInteger(values.shortBreakMinutes) ||
      !isPositiveInteger(values.longBreakMinutes) ||
      !isPositiveInteger(values.longBreakEvery)
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "正の整数を入力してください",
        message: "作業時間、休憩時間、長休憩間隔には 1 以上の整数が必要です。",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await savePomodoroConfigOverrides({
        workMinutes: Number.parseInt(values.workMinutes, 10),
        shortBreakMinutes: Number.parseInt(values.shortBreakMinutes, 10),
        longBreakMinutes: Number.parseInt(values.longBreakMinutes, 10),
        longBreakEvery: Number.parseInt(values.longBreakEvery, 10),
      });

      const updatedConfig = getPomodoroConfig();
      await onSaved(updatedConfig);
      await showToast({
        style: Toast.Style.Success,
        title: "タイマー設定を更新しました",
        message: "次に開始するセッションから反映されます。",
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
          <Action.SubmitForm
            title="タイマー設定を保存"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="反映タイミング"
        text="現在進行中のセッションには反映せず、次に開始するセッションから使います。"
      />
      <Form.TextField
        id="workMinutes"
        title="作業時間（分）"
        defaultValue={String(currentConfig.workMinutes)}
      />
      <Form.TextField
        id="shortBreakMinutes"
        title="短休憩（分）"
        defaultValue={String(currentConfig.shortBreakMinutes)}
      />
      <Form.TextField
        id="longBreakMinutes"
        title="長休憩（分）"
        defaultValue={String(currentConfig.longBreakMinutes)}
      />
      <Form.TextField
        id="longBreakEvery"
        title="長休憩の間隔（セット）"
        defaultValue={String(currentConfig.longBreakEvery)}
      />
    </Form>
  );
}
