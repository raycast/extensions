import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { plannedTimeSteps, setPlannedTime } from "../lib/sunsama-client";
import { runWithToast } from "../lib/errors";
import { parseDuration } from "../lib/time";

const TIME_HINT = "1h 30m · 90 · 1:15 · 45m";

interface Props {
  taskId: string;
  /** When set, edits a subtask's planned time instead of the task's. */
  subtaskId?: string;
  title: string;
  /** Current value in minutes, used to prefill the field. */
  currentMinutes: number;
  /**
   * Subtask ids that carry their own planned time. A task's planned time is the
   * sum of its subtasks, so the server refuses a task-level estimate until
   * these are cleared — we confirm and clear them first.
   */
  clearSubtaskIds?: string[];
  onSaved: () => void;
}

export function SetTimeForm({
  taskId,
  subtaskId,
  title,
  currentMinutes,
  clearSubtaskIds,
  onSaved,
}: Props) {
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);

  // A task's planned total is driven by its subtasks; clearing them is required
  // for the new value to take effect.
  const mustClearSubtasks = !subtaskId && (clearSubtaskIds?.length ?? 0) > 0;

  const { handleSubmit, itemProps } = useForm<{ value: string }>({
    async onSubmit(values) {
      // Validation already rejected anything unparseable.
      const minutes = parseDuration(values.value) as number;

      if (mustClearSubtasks) {
        const ok = await confirmAlert({
          title: "Clear subtask planned times?",
          message:
            "This task's planned time is the sum of its subtasks. Setting it will clear all subtask planned times.",
          icon: { source: Icon.Clock },
          primaryAction: {
            title: "Set & Clear Subtasks",
            style: Alert.ActionStyle.Destructive,
          },
        });
        if (!ok) return;
      }

      // Setting a task's own time can take several requests, since each
      // subtask estimate has to be cleared first and each one persists
      // separately. Track them individually so a failure part-way through
      // still refreshes what landed.
      const steps = subtaskId
        ? [{ run: () => setPlannedTime(taskId, minutes, subtaskId) }]
        : plannedTimeSteps(taskId, minutes, clearSubtaskIds ?? []);

      setSaving(true);
      let applied = 0;
      const ok = await runWithToast(
        {
          pending: "Saving…",
          success: "Planned time set",
          failure: "Failed to set planned time",
        },
        async () => {
          try {
            for (const step of steps) {
              await step.run();
              applied++;
            }
          } catch (error) {
            const detail =
              error instanceof Error ? error.message : String(error);
            throw applied > 0
              ? new Error(
                  `Applied ${applied} of ${steps.length} changes, then: ${detail}`,
                )
              : error;
          }
        },
      );
      setSaving(false);

      // Refresh the list for whatever did land.
      if (applied > 0) onSaved();
      // Close only when everything saved, so a partial failure keeps the
      // entered time on screen to retry rather than discarding it.
      if (ok) pop();
    },
    initialValues: {
      value: currentMinutes > 0 ? String(currentMinutes) : "",
    },
    validation: {
      value: (value) =>
        parseDuration(value ?? "") === null
          ? `Enter a time like ${TIME_HINT}`
          : undefined,
    },
  });

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Set Planned Time"
            icon={Icon.Clock}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`Set planned time for “${title}”.`} />
      <Form.TextField
        {...itemProps.value}
        title="Planned Time"
        placeholder={TIME_HINT}
        autoFocus
      />
    </Form>
  );
}
