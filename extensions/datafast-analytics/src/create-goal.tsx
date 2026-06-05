import { Action, ActionPanel, Form, LocalStorage, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";

import { createGoal } from "./datafast";

type GoalFormValues = {
  visitorId: string;
  name: string;
  description: string;
  metadata: string;
};

type RecentGoalValues = {
  visitorId?: string;
  name?: string;
};

const RECENT_GOAL_KEY = "recent-goal-values";

export default function Command() {
  const [recent, setRecent] = useState<RecentGoalValues>({});

  useEffect(() => {
    async function loadRecent() {
      const stored = await LocalStorage.getItem<string>(RECENT_GOAL_KEY);
      if (!stored) {
        return;
      }

      try {
        setRecent(JSON.parse(stored) as RecentGoalValues);
      } catch {
        setRecent({});
      }
    }

    void loadRecent();
  }, []);

  async function handleSubmit(values: GoalFormValues) {
    const visitorId = values.visitorId.trim();
    const name = values.name.trim();

    if (!visitorId) {
      await showToast({ style: Toast.Style.Failure, title: "Visitor ID is required" });
      return;
    }

    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "Goal name is required" });
      return;
    }

    const metadata = parseMetadata(values.metadata);
    if (metadata instanceof Error) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid metadata JSON", message: metadata.message });
      return;
    }

    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating goal" });

    try {
      const result = await createGoal({
        visitorId,
        name,
        description: values.description.trim(),
        metadata,
      });

      await LocalStorage.setItem(RECENT_GOAL_KEY, JSON.stringify({ visitorId, name }));

      toast.style = Toast.Style.Success;
      toast.title = "Goal created";
      toast.message = result[0]?.eventId || result[0]?.message || name;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create goal";
      toast.message = error instanceof Error ? error.message : "DataFast rejected the request.";
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Goal" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="visitorId"
        title="Visitor ID"
        placeholder="a3ab2331-989f-4cfa-91c6-2461c9e3c6bd"
        defaultValue={recent.visitorId}
      />
      <Form.TextField id="name" title="Goal Name" placeholder="newsletter_signup" defaultValue={recent.name} />
      <Form.TextField id="description" title="Description" placeholder="Optional event description" />
      <Form.TextArea
        id="metadata"
        title="Metadata JSON"
        placeholder={'{\n  "plan": "pro",\n  "source": "raycast"\n}'}
      />
    </Form>
  );
}

function parseMetadata(value: string): Record<string, string> | Error | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      return new Error("Metadata must be a JSON object.");
    }

    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, rawValue]) => [key, String(rawValue)]),
    );
  } catch (error) {
    return error instanceof Error ? error : new Error("Could not parse metadata.");
  }
}
