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
import { useRef, useState } from "react";
import {
  editNotes,
  editTitle,
  plannedTimeSteps,
  rescheduleTask,
  setChannel,
  subtasksWithPlannedTime,
} from "../lib/sunsama-client";
import { runWithToast } from "../lib/errors";
import { toDayString } from "../lib/date";
import { parseDuration } from "../lib/time";
import { Task } from "../lib/types";
import {
  ChannelDropdown,
  RefreshChannelsAction,
  useChannels,
} from "./channel-dropdown";

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
  const channels = useChannels();

  // What the server is believed to hold. Each field is saved by its own
  // request, so a failure part-way through leaves some already applied; this
  // advances as they succeed, and the form diffs against it rather than the
  // values it opened with. Retrying after a partial save then sends exactly
  // what is still outstanding — including a field changed back to what it
  // originally was, which a diff against the untouched task would miss.
  const saved = useRef({
    title: task.title,
    notes: (task.notes ?? "").trim(),
    channel: currentChannel,
    day,
    timeEstimate: task.timeEstimate,
    subtasksWithTime: subtasksWithPlannedTime(task),
  });

  const { handleSubmit, itemProps } = useForm<FormValues>({
    async onSubmit(values) {
      const title = values.title.trim();
      const notes = values.notes.trim();
      const newDay = values.day ? toDayString(values.day) : null;
      const newEstimate = values.timeEstimate.trim()
        ? (parseDuration(values.timeEstimate) as number)
        : undefined;

      // Only send fields that differ from what the server holds. `commit`
      // records the new value once its request succeeds.
      const changes: Array<{ run: () => Promise<void>; commit: () => void }> =
        [];
      if (title !== saved.current.title) {
        changes.push({
          run: () => editTitle(task.id, title),
          commit: () => (saved.current.title = title),
        });
      }

      // A task's estimate is derived from its subtasks whenever they carry one,
      // and the server rejects a task-level estimate until those are cleared.
      const blockingSubtasks = [...saved.current.subtasksWithTime];
      if (
        newEstimate !== undefined &&
        newEstimate !== saved.current.timeEstimate
      ) {
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
        // Added as individual steps because each clears one subtask and
        // persists on its own; the step without `clears` sets the estimate.
        for (const step of plannedTimeSteps(
          task.id,
          newEstimate,
          blockingSubtasks,
        )) {
          changes.push({
            run: step.run,
            commit: () => {
              // Record only the subtask this step cleared. Marking them all
              // cleared would make a retry skip the ones that never ran, and
              // the server rejects the estimate while any of them still has
              // planned time.
              if (step.clears) {
                saved.current.subtasksWithTime =
                  saved.current.subtasksWithTime.filter(
                    (id) => id !== step.clears,
                  );
              } else {
                saved.current.timeEstimate = newEstimate;
              }
            },
          });
        }
      }

      if (values.channel && values.channel !== saved.current.channel) {
        changes.push({
          run: () => setChannel(task.id, values.channel),
          commit: () => (saved.current.channel = values.channel),
        });
      }
      if (notes !== saved.current.notes) {
        changes.push({
          run: () => editNotes(task.id, notes),
          commit: () => (saved.current.notes = notes),
        });
      }
      if (newDay !== saved.current.day) {
        changes.push({
          run: () => rescheduleTask(task.id, newDay),
          commit: () => (saved.current.day = newDay ?? day),
        });
      }

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
      // Each field is its own request and the server has no way to apply them
      // together, so a failure part-way through leaves the earlier ones saved.
      // Report how far it got rather than a bare failure, and refresh either
      // way so the list shows what actually landed.
      let applied = 0;
      const ok = await runWithToast(
        {
          pending: "Saving…",
          success: "Task updated",
          failure: "Failed to update task",
        },
        async () => {
          try {
            for (const change of changes) {
              await change.run();
              change.commit();
              applied++;
            }
          } catch (error) {
            const detail =
              error instanceof Error ? error.message : String(error);
            throw applied > 0
              ? new Error(
                  `Saved ${applied} of ${changes.length} changes, then: ${detail}`,
                )
              : error;
          }
        },
      );
      setSubmitting(false);

      // Refresh the list for whatever did land.
      if (applied > 0) onSaved();
      // Close only when everything saved. On a partial failure the form stays
      // open with the values still in it, so the edit isn't lost and can be
      // retried against what actually landed.
      if (ok) pop();
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
          <RefreshChannelsAction channels={channels} />
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
      <ChannelDropdown
        {...itemProps.channel}
        channels={channels}
        ensureName={currentChannel}
        // A task already in a channel can't be taken out of one, so don't
        // offer an option that would silently do nothing.
        allowNone={!currentChannel}
      />
      <Form.TextField
        {...itemProps.timeEstimate}
        title="Time Estimate"
        placeholder={TIME_HINT}
      />
    </Form>
  );
}
