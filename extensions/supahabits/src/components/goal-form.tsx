import { Action, ActionPanel, Form, getPreferenceValues, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import fetch from "node-fetch";

import { Goal } from "../models/goal";
import { nextWeekDate, parseISODate } from "../utils/dates";

interface GoalFormProps {
  goal?: Goal;
  onSuccess: () => void;
  mode: "create" | "edit";
}

export default function GoalForm({ goal, onSuccess, mode }: GoalFormProps) {
  const { secret } = getPreferenceValues<Preferences>();
  const { pop } = useNavigation();
  const [title, setTitle] = useState<string>(goal?.title || "");
  const [description, setDescription] = useState<string>(goal?.description || "");
  const [dueDate, setDueDate] = useState<Date>(goal ? parseISODate(goal.due_date) : nextWeekDate());

  const handleSubmit = async () => {
    if (!title.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Title is required" });
      return;
    }

    try {
      const endpoint = "https://www.supahabits.com/api/goals";
      const method = mode === "create" ? "POST" : "PUT";

      const body: Record<string, unknown> = {
        secret,
        title,
        description: description || undefined,
        due_date: dueDate.toISOString(),
      };

      // Add goal_id for edit mode
      if (mode === "edit" && goal) {
        body.goal_id = goal.id;
      }

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${mode} goal: ${response.statusText}`);
      }

      const action = mode === "create" ? "created" : "updated";
      await showToast({ style: Toast.Style.Success, title: `Goal ${action} successfully` });
      onSuccess();
      pop();
    } catch (error) {
      console.error(`Error ${mode === "create" ? "creating" : "updating"} goal:`, error);
      await showToast({
        style: Toast.Style.Failure,
        title: `Failed to ${mode === "create" ? "create" : "update"} goal`,
        message: String(error),
      });
    }
  };

  const submitLabel = mode === "create" ? "Create Goal" : "Update Goal";

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitLabel} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        placeholder="Enter goal title"
        value={title}
        onChange={setTitle}
        autoFocus
      />
      <Form.TextArea
        id="description"
        title="Description (optional)"
        placeholder="Enter goal description"
        value={description}
        onChange={setDescription}
      />
      <Form.DatePicker
        id="dueDate"
        title="Due Date"
        value={dueDate}
        onChange={(date) => {
          setDueDate(date ?? new Date());
        }}
      />
    </Form>
  );
}
