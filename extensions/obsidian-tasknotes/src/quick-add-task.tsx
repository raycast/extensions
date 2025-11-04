// Quick Add Task with Natural Language Processing

import { Form, ActionPanel, Action, showToast, Toast, popToRoot } from "@raycast/api";
import { useState } from "react";
import { getClient } from "./api/client";

export default function QuickAddTask() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function handleSubmit() {
    if (!text.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Input Required",
        message: "Please enter a task description",
      });
      return;
    }

    setIsLoading(true);

    try {
      const client = getClient();

      // Check API health first
      const health = await client.checkHealth();
      if (!health.success) {
        throw new Error("API is not available");
      }

      // Create task using NLP
      const response = await client.createTaskNLP({
        text: text.trim(),
        locale: "en",
      });

      if (!response.success || !response.data) {
        throw new Error(response.error || "Failed to create task");
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Task Created",
        message: response.data.task.title,
      });

      await popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Create Task",
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Task" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Task Description"
        placeholder="Buy milk due tomorrow #grocery @errands !!! 30min"
        value={text}
        onChange={setText}
        autoFocus
      />
      <Form.Description
        title="Examples"
        text={`• "Buy milk due tomorrow #grocery @errands"
• "Finish report due friday !!! 2h"
• "Call client scheduled today at 2pm +ProjectX"
• "Review PR #code daily 30min"

Supported formats:
  Due dates: due tomorrow, due friday, due next week
  Scheduled: scheduled today, scheduled at 2pm
  Priority: !!!, !!, ! or "urgent"
  Tags: #tag
  Contexts: @context
  Projects: +project
  Time estimate: 30min, 2h
  Recurrence: daily, weekly, every monday`}
      />
    </Form>
  );
}
