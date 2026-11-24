import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { FormValidation, useForm } from "@raycast/utils";
import { useState } from "react";
import { editSubtaskTitle } from "../lib/sunsama-client";
import { runWithToast } from "../lib/errors";
import { Subtask } from "../lib/types";

interface Props {
  taskId: string;
  subtask: Subtask;
  onSaved: () => void;
}

export function EditSubtaskForm({ taskId, subtask, onSaved }: Props) {
  const { pop } = useNavigation();
  const [saving, setSaving] = useState(false);

  const { handleSubmit, itemProps } = useForm<{ title: string }>({
    async onSubmit(values) {
      const title = values.title.trim();
      if (title === subtask.title) {
        pop();
        return;
      }

      setSaving(true);
      const ok = await runWithToast(
        {
          pending: "Saving…",
          success: "Subtask updated",
          failure: "Failed to update subtask",
        },
        () => editSubtaskTitle(taskId, subtask.id, title),
      );
      setSaving(false);
      if (ok) {
        onSaved();
        pop();
      }
    },
    initialValues: { title: subtask.title },
    validation: { title: FormValidation.Required },
  });

  return (
    <Form
      isLoading={saving}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            icon={Icon.Check}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        {...itemProps.title}
        title="Subtask"
        placeholder="What this step involves"
      />
    </Form>
  );
}
