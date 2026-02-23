import React, { useState } from "react";
import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { createQuest, CreateQuestPayload } from "../api";

interface CreateQuestFormProps {
  onSuccess: () => void;
}

export function CreateQuestForm({ onSuccess }: CreateQuestFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: { title: string; note: string; difficulty: string; status: string }) {
    if (!values.title.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Title Required",
        message: "Please enter a quest title",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating quest...",
    });

    try {
      const payload: CreateQuestPayload = {
        title: values.title.trim(),
        note: values.note?.trim() || undefined,
        difficulty: (values.difficulty || "medium") as CreateQuestPayload["difficulty"],
        status: (values.status || "todo") as CreateQuestPayload["status"],
      };

      await createQuest(payload);

      toast.style = Toast.Style.Success;
      toast.title = "Quest Created!";
      toast.message = `"${payload.title}" has been added to your quests`;

      onSuccess();
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create quest";
      toast.message = error instanceof Error ? error.message : "Unknown error";
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Quest" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter quest title" autoFocus />

      <Form.TextArea id="note" title="Note" placeholder="Add quest description or notes (optional)" />

      <Form.Dropdown id="difficulty" title="Difficulty" defaultValue="medium">
        <Form.Dropdown.Item value="easy" title="Easy" />
        <Form.Dropdown.Item value="medium" title="Medium" />
        <Form.Dropdown.Item value="hard" title="Hard" />
        <Form.Dropdown.Item value="epic" title="Epic" />
        <Form.Dropdown.Item value="legendary" title="Legendary" />
      </Form.Dropdown>

      <Form.Dropdown id="status" title="Status" defaultValue="todo">
        <Form.Dropdown.Item value="todo" title="To Do" />
        <Form.Dropdown.Item value="doing" title="In Progress" />
      </Form.Dropdown>
    </Form>
  );
}
