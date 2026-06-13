import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

interface ChecklistFormProps {
  taskId: string;
  taskText: string;
  /** Existing item being edited — when omitted, the form adds a new item. */
  existingItemId?: string;
  existingItemText?: string;
  onSubmitted: () => void;
  /** Add a new item to the task. Required when existingItemId is omitted. */
  onAdd?: (taskId: string, text: string) => Promise<void>;
  /** Update an existing item. Required when existingItemId is provided. */
  onUpdate?: (taskId: string, itemId: string, text: string) => Promise<void>;
}

interface FormValues {
  text: string;
}

export default function ChecklistForm({
  taskId,
  taskText,
  existingItemId,
  existingItemText,
  onSubmitted,
  onAdd,
  onUpdate,
}: ChecklistFormProps) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(existingItemId);

  async function handleSubmit(values: FormValues) {
    const trimmed = values.text.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Item text is required" });
      return;
    }

    try {
      setSubmitting(true);
      await showToast({
        style: Toast.Style.Animated,
        title: isEdit ? "Updating item…" : "Adding item…",
      });
      if (isEdit) {
        if (!onUpdate || !existingItemId) throw new Error("Missing update handler");
        await onUpdate(taskId, existingItemId, trimmed);
      } else {
        if (!onAdd) throw new Error("Missing add handler");
        await onAdd(taskId, trimmed);
      }
      await showToast({ style: Toast.Style.Success, title: isEdit ? "Item updated" : "Item added" });
      onSubmitted();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: isEdit ? "Failed to update item" : "Failed to add item",
        message: String(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Form
      navigationTitle={`${isEdit ? "Edit Item" : "Add Item"}: ${taskText}`}
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={isEdit ? "Save Item" : "Add Item"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Checklist Item"
        placeholder="Sub-task description"
        defaultValue={existingItemText ?? ""}
        autoFocus
      />
    </Form>
  );
}
