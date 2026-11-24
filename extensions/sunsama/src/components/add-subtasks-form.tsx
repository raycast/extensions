import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { useState } from "react";
import { addSubtasks } from "../lib/sunsama-client";
import { runWithToast } from "../lib/errors";
import { parseSubtasks } from "../lib/time";
import { Task } from "../lib/types";

interface Props {
  task: Task;
  onSaved: () => void;
}

export function AddSubtasksForm({ task, onSaved }: Props) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);

  const { handleSubmit, itemProps } = useForm<{ subtasks: string }>({
    async onSubmit(values) {
      const subtasks = parseSubtasks(values.subtasks);
      setSubmitting(true);
      const ok = await runWithToast(
        {
          pending: "Adding subtasks…",
          success: `Added ${subtasks.length} subtask${subtasks.length > 1 ? "s" : ""}`,
          failure: "Failed to add subtasks",
        },
        () => addSubtasks(task.id, subtasks),
      );
      setSubmitting(false);
      if (ok) {
        onSaved();
        pop();
      }
    },
    validation: {
      subtasks: (value) =>
        parseSubtasks(value ?? "").length === 0
          ? "Enter at least one subtask"
          : undefined,
    },
  });

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Subtasks"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={`Adding subtasks to “${task.title}”. One per line.`}
      />
      <Form.TextArea
        {...itemProps.subtasks}
        title="Subtasks"
        placeholder={"Draft outline\nReview with team"}
        autoFocus
      />
    </Form>
  );
}
