import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  open,
  popToRoot,
} from "@raycast/api";
import { useState } from "react";
import type { Preferences, CreateIssueResponse } from "./lib/types";

export default function Command() {
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Empty content",
        message: "Please enter some text",
      });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating issue...",
      message: "Cleaning up text and creating Linear issue",
    });

    try {
      const preferences = getPreferenceValues<Preferences>();

      const response = await fetch(preferences.supabaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: content }),
      });

      const data: CreateIssueResponse = await response.json();

      if (!data.ok || !data.issue) {
        throw new Error(data.error || "Failed to create issue");
      }

      // Success!
      toast.style = Toast.Style.Success;
      toast.title = `Created ${data.issue.identifier}`;
      toast.message = content.split("\n")[0].substring(0, 50);

      // Add action to open the issue
      toast.primaryAction = {
        title: "Open Issue",
        onAction: () => open(data.issue!.url),
      };

      // Clear the form and close
      setContent("");
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed to create issue";
      toast.message = error instanceof Error ? error.message : "Unknown error";
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Issue" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="content"
        title="Issue Content"
        placeholder="First line = title, rest = description..."
        value={content}
        onChange={setContent}
        enableMarkdown
      />
      <Form.Description
        title="Format"
        text="Line 1: Issue title&#10;Lines 2+: Description (optional)&#10;&#10;Text is cleaned up with Claude before creating the issue."
      />
    </Form>
  );
}
