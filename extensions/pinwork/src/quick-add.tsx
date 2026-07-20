/**
 * Quick Add command - create tasks using natural language input.
 *
 * Supports Pinwork's natural language parsing:
 * - "Buy groceries tomorrow"
 * - "Call mom at 3pm #personal"
 * - "Review PR :ProjectName ~30m"
 */

import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  popToRoot,
  Icon,
} from "@raycast/api";
import { useState } from "react";
import { FormValidation, showFailureToast, useForm } from "@raycast/utils";
import { quickAddTask } from "./api/pinwork";
import { usePinworkAvailability } from "./hooks/usePinworkAvailability";

interface FormValues {
  text: string;
}

export default function QuickAddCommand() {
  const availability = usePinworkAvailability();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { handleSubmit, itemProps, reset } = useForm<FormValues>({
    initialValues: { text: "" },
    validation: {
      text: FormValidation.Required,
    },
    onSubmit: async (values) => {
      if (!availability.isReady) {
        await showToast({
          style: Toast.Style.Failure,
          title: availability.installed
            ? "Pinwork Not Running"
            : "Pinwork Not Installed",
          message: availability.installed
            ? "Open Pinwork to add tasks."
            : "Install the Pinwork app to add tasks.",
        });
        return;
      }

      const text = values.text.trim();

      if (!text) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Empty Task",
          message: "Please enter a task description",
        });
        return;
      }

      try {
        setIsSubmitting(true);
        await quickAddTask({ text });
        reset({ text: "" });
        await popToRoot();
      } catch (err) {
        await showFailureToast(err, { title: "Failed to add task" });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Quick Add Task"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Task"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        title="Task"
        placeholder="Buy groceries tomorrow at 2pm #errands ~30m"
        autoFocus
        {...itemProps.text}
      />

      <Form.Description
        title="Hints"
        text={`Examples:
Buy groceries tomorrow at 2pm #errands ~30m
Review PR :Pinwork !fri`}
      />
    </Form>
  );
}
