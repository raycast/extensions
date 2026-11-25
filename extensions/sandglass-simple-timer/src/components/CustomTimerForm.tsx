import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { parseDuration } from "../lib/parse.ts";
import { startTimer } from "../lib/timer-service.ts";
import type { SandglassState } from "../lib/types.ts";

const HINT = "Try 25, 1h 30m, 10:00 or at 15:30";

interface CustomTimerValues {
  duration: string;
  label: string;
}

export function CustomTimerForm({ onStarted }: { onStarted: (state: SandglassState) => void }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<CustomTimerValues>({
    onSubmit(values) {
      const parsed = parseDuration(values.duration);
      if (!parsed) return false; // validation already shows the hint; keep the form open
      try {
        const state = startTimer(parsed.ms, values.label.trim() || parsed.label, true);
        pop();
        onStarted(state);
      } catch (error) {
        void showFailureToast(error, { title: "Couldn't start the timer" });
        return false;
      }
    },
    validation: {
      duration: (value) => {
        if (!value?.trim()) return "Enter a duration";
        if (!parseDuration(value)) return HINT;
      },
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" icon={Icon.Play} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Duration"
        placeholder="e.g. 25, 1h 30m, 10:00 or at 15:30"
        autoFocus
        {...itemProps.duration}
      />
      <Form.TextField title="Label" placeholder="e.g. Tea" {...itemProps.label} />
    </Form>
  );
}
