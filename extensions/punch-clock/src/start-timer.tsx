import { useEffect, useState } from "react";
import { Action, ActionPanel, Alert, confirmAlert, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { parseWholeNumber, validateBreakMinutes, validateHours, validateMinutes } from "./duration";
import { formatClock, getState, startTimer, TimerState } from "./timer";

interface FormValues {
  hours: string;
  minutes: string;
  breakMinutes: string;
}

export default function StartTimer() {
  const [existing, setExisting] = useState<TimerState | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getState()
      .then((state) => {
        setExisting(state);
      })
      .catch(() => {
        void showToast({
          style: Toast.Style.Failure,
          title: "Failed to load timer state",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const { handleSubmit, itemProps, setValidationError } = useForm<FormValues>({
    initialValues: {
      hours: "8",
      minutes: "0",
      breakMinutes: "30",
    },
    validation: {
      hours: validateHours,
      minutes: validateMinutes,
      breakMinutes: validateBreakMinutes,
    },
    async onSubmit(values) {
      const hours = parseWholeNumber(values.hours) ?? 0;
      const minutes = parseWholeNumber(values.minutes) ?? 0;
      const breakMinutes = parseWholeNumber(values.breakMinutes) ?? 0;
      const totalMinutes = hours * 60 + minutes;

      if (totalMinutes <= 0) {
        setValidationError("minutes", "Enter a working time greater than 0");
        return;
      }

      if (existing?.running) {
        const confirmed = await confirmAlert({
          title: "Replace Running Timer?",
          message: "A timer is already running. Starting a new one will replace it.",
          primaryAction: { title: "Replace", style: Alert.ActionStyle.Destructive },
        });
        if (!confirmed) return;
      }

      setIsSubmitting(true);
      try {
        const state = await startTimer(totalMinutes, breakMinutes);
        await showToast({
          style: Toast.Style.Success,
          title: "Timer Started",
          message: `Ends around ${formatClock(state.endTime)}`,
        });
        await popToRoot();
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to start timer",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Form
      isLoading={isLoading || isSubmitting}
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
      <Form.TextField title="Working Hours" placeholder="8" {...itemProps.hours} />
      <Form.TextField title="Working Minutes" placeholder="0" {...itemProps.minutes} />
      <Form.Separator />
      <Form.TextField title="Break (minutes)" placeholder="30" {...itemProps.breakMinutes} />
    </Form>
  );
}
