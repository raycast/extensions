import React from "react";
import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";

export type TaskFormValues = {
  taskTitle: string;
  priority?: string;
  status?: string;
  due?: Date | null;
  scheduled?: Date | null;
  tags?: string;
  projects?: string;
  contexts?: string;
  details?: string;
  timeEstimate?: string;
};

interface TaskFormProps {
  initialValues?: Partial<TaskFormValues>;
  submitLabel?: string;
  onSubmit: (values: TaskFormValues) => Promise<boolean> | Promise<void>;
  onSuccess?: () => void;
  popOnSuccess?: boolean;
}

export default function TaskForm({
  initialValues = {},
  submitLabel = "Save",
  onSubmit,
  onSuccess,
  popOnSuccess = false,
}: TaskFormProps) {
  const { pop } = useNavigation();

  const { itemProps, handleSubmit } = useForm<TaskFormValues>({
    initialValues: {
      taskTitle: initialValues.taskTitle ?? "",
      priority: initialValues.priority ?? "normal",
      status: initialValues.status ?? "open",
      due: initialValues.due ?? undefined,
      scheduled: initialValues.scheduled ?? undefined,
      tags: initialValues.tags ?? "",
      projects: initialValues.projects ?? "",
      contexts: initialValues.contexts ?? "",
      details: initialValues.details ?? "",
      timeEstimate: initialValues.timeEstimate ?? "",
    } as TaskFormValues,
    validation: {
      taskTitle: FormValidation.Required,
    },
    async onSubmit(values) {
      try {
        const result = await onSubmit(values as TaskFormValues);
        await showToast({ style: Toast.Style.Success, title: "Saved" });
        if (onSuccess) onSuccess();
        // go back to preview/list when requested (only for edit flows)
        if (popOnSuccess) {
          try {
            pop();
          } catch {
            /* ignore if navigation not available */
          }
        }
        return result;
      } catch (error: unknown) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to save",
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitLabel} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField {...itemProps.taskTitle} title="Title" placeholder="Task title" />
      <Form.Dropdown {...itemProps.priority} title="Priority">
        <Form.Dropdown.Item title="None" value="none" />
        <Form.Dropdown.Item title="High" value="high" />
        <Form.Dropdown.Item title="Normal" value="normal" />
        <Form.Dropdown.Item title="Low" value="low" />
      </Form.Dropdown>
      <Form.Dropdown {...itemProps.status} title="Status">
        <Form.Dropdown.Item title="None" value="none" />
        <Form.Dropdown.Item title="Open" value="open" />
        <Form.Dropdown.Item title="In Progress" value="in-progress" />
        <Form.Dropdown.Item title="Done" value="done" />
      </Form.Dropdown>
      <Form.DatePicker {...itemProps.due} title="Due" />
      <Form.DatePicker {...itemProps.scheduled} title="Scheduled" />
      <Form.TextField {...itemProps.tags} title="Tags" />
      <Form.TextField {...itemProps.projects} title="Projects" />
      <Form.TextField {...itemProps.contexts} title="Contexts" />
      <Form.TextArea {...itemProps.details} title="Details" />
      <Form.TextField {...itemProps.timeEstimate} title="Time estimate (minutes)" />
    </Form>
  );
}
