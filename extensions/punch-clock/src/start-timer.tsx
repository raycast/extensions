import { useEffect, useState } from "react";
import { Action, ActionPanel, Form, Icon, showToast, Toast, popToRoot, confirmAlert, Alert } from "@raycast/api";
import { getState, startTimer, formatClock, TimerState } from "./timer";

interface FormValues {
  hours: string;
  minutes: string;
  breakMinutes: string;
}

export default function StartTimer() {
  const [existing, setExisting] = useState<TimerState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getState().then((state) => {
      setExisting(state);
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit(values: FormValues) {
    const hours = Number(values.hours) || 0;
    const minutes = Number(values.minutes) || 0;
    const breakMinutes = Number(values.breakMinutes) || 0;
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) {
      await showToast({ style: Toast.Style.Failure, title: "Enter a working time greater than 0" });
      return;
    }

    if (existing?.running) {
      const confirmed = await confirmAlert({
        title: "Replace running timer?",
        message: "A timer is already running. Starting a new one will replace it.",
        primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
      });
      if (!confirmed) return;
    }

    const state = await startTimer(totalMinutes, breakMinutes);

    await showToast({
      style: Toast.Style.Success,
      title: "Timer started",
      message: `Ends around ${formatClock(state.endTime)}`,
    });
    await popToRoot();
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Punch Clock"
        text="Enter how long you want to work today and how long your break will be. The countdown (work time + break) will then run in the menu bar."
      />
      <Form.TextField id="hours" title="Working Hours" placeholder="8" defaultValue="8" />
      <Form.TextField id="minutes" title="Working Minutes" placeholder="0" defaultValue="0" />
      <Form.Separator />
      <Form.TextField id="breakMinutes" title="Break (minutes)" placeholder="30" defaultValue="30" />
    </Form>
  );
}
