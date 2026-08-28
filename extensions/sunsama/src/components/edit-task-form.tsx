import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  useNavigation,
} from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import {
  editNotes,
  editTitle,
  rescheduleTask,
  setChannel,
  setTaskPlannedTime,
  subtasksWithPlannedTime,
} from "../lib/sunsama-client";
import { runWithToast } from "../lib/errors";
import { toDayString } from "../lib/date";
import { parseDuration } from "../lib/time";
import { Task } from "../lib/types";
import { ChannelDropdown } from "./channel-dropdown";

const TIME_HINT = "1h 30m · 90 · 1:15 · 45m";

interface Props {
  task: Task;
  /** The day the task is currently on (YYYY-MM-DD), used to detect a move. */
  day: string;
  onSaved: () => void;
}

interface FormValues {
  title: string;
  notes: string;
  day: Date | null;
  channel: string;
  timeEstimate: string;
}

export function EditTaskForm({ task, day, onSaved }: Props) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  const currentChannel = task.channelName ?? "";

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const title = values.title.trim();
      const newEstimate = values.timeEstimate.trim()
        ? (parseDuration(values.timeEstimate) as number)
        : undefined;

      // Only send fields that actually changed.
      const changes: Array<() => Promise<void>> = [];
      if (title !== task.title) changes.push(() => editTitle(task.id, title));

      // A task's estimate is derived from its subtasks whenever they carry one,
      // and the server rejects a task-level estimate until those are cleared.
      const blockingSubtasks = subtasksWithPlannedTime(task);
      if (newEstimate !== undefined && newEstimate !== task.timeEstimate) {
        if (blockingSubtasks.length > 0) {
          const ok = await confirmAlert({
            title: "Clear subtask planned times?",
            message:
              "This task's planned time is the sum of its subtasks. Changing it will clear all subtask planned times.",
            icon: { source: Icon.Clock },
            primaryAction: {
              title: "Set & Clear Subtasks",
              style: Alert.ActionStyle.Destructive,
            },
          });
          if (!ok) return;
        }
        changes.push(() =>
          setTaskPlannedTime(task.id, newEstimate, blockingSubtasks),
        );
      }

      if (values.channel && values.channel !== currentChannel) {
        changes.push(() => setChannel(task.id, values.channel));
      }
      if (values.notes.trim() !== (task.notes ?? "").trim()) {
        changes.push(() => editNotes(task.id, values.notes.trim()));
      }
      const newDay = values.day ? toDayString(values.day) : null;
      if (newDay !== day) changes.push(() => rescheduleTask(task.id, newDay));

      if (changes.length === 0) {
        pop();
        return;
      }

      // Clearing the day moves the task off every day into the backlog —
      // confirm, since it then disappears from this list.
      if (newDay === null) {
        const confirmed = await confirmAlert({
          title: "Move to backlog?",
          message: `"${task.title}" will be removed from this day and moved to your backlog.`,
          icon: { source: Icon.Tray, tintColor: Color.Orange },
          primaryAction: { title: "Move to Backlog" },
        });
        if (!confirmed) return;
      }

      setSubmitting(true);
      const ok = await runWithToast(
        {
          pending: "Saving…",
          success: "Task updated",
          failure: "Failed to update task",
        },
        async () => {
          for (const change of changes) await change();
        },
      );
      setSubmitting(false);
      if (ok) {
        onSaved();
        pop();
      }
    },
    initialValues: {
      title: task.title,
      notes: task.notes ?? "",
      day: new Date(`${day}T00:00:00`),
      channel: currentChannel,
      timeEstimate: task.timeEstimate != null ? String(task.timeEstimate) : "",
    },
    validation: {
      title: FormValidation.Required,
      // Optional, but must parse when filled in.
      timeEstimate: (value) =>
        value?.trim() && parseDuration(value) === null
          ? `Enter a time like ${TIME_HINT}`
          : undefined,
    },
  });

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Changes"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Title"
        placeholder="What needs doing"
      />
      <Form.TextArea
        {...itemProps.notes}
        title="Notes"
        placeholder="Optional details (Markdown supported)"
        enableMarkdown
      />
      <Form.DatePicker
        {...itemProps.day}
        title="Day"
        type={Form.DatePicker.Type.Date}
      />
      <ChannelDropdown {...itemProps.channel} ensureName={currentChannel} />
      <Form.TextField
        {...itemProps.timeEstimate}
        title="Time Estimate"
        placeholder={TIME_HINT}
      />
    </Form>
  );
}
