import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  openExtensionPreferences,
  popToRoot,
  showToast,
  Toast,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useEffect, useState } from "react";
import { parseWholeNumber, validateBreakMinutes, validateHours, validateMinutes } from "./duration";
import { formatClock, getState, hasMenuBarBeenSeen, startTimer, TimerState } from "./timer";

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

        if (await hasMenuBarBeenSeen()) {
          await showToast({
            style: Toast.Style.Success,
            title: "Timer Started",
            message: `Ends around ${formatClock(state.endTime)}`,
          });
        } else {
          // The menu-bar command has never run, so it's very likely not enabled yet and the
          // countdown won't be visible anywhere. Block with an alert instead of a toast that
          // could be missed or auto-dismiss before the user notices.
          await confirmAlert({
            title: "Enable the Menu Bar to See Your Timer",
            message: `Timer started, ends around ${formatClock(state.endTime)}. Enable "Work Timer" in your menu bar to see the countdown.`,
            primaryAction: {
              title: "Open Extension Preferences",
              onAction: () => openExtensionPreferences(),
            },
            dismissAction: { title: "OK" },
          });
        }
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
          <Action
            title="Enable Menu Bar…"
            icon={Icon.Gear}
            shortcut={{ modifiers: ["cmd"], key: "," }}
            onAction={() => openExtensionPreferences()}
          />
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
