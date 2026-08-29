import { useState } from "react";
import { Action, ActionPanel, Clipboard, Form, open, popToRoot, showToast, Toast } from "@raycast/api";
import { aiCreateForm } from "./lib/api";
import { OrbiformAuthError, reconnect } from "./lib/oauth";

/**
 * Same starter prompts as the Orbiform dashboard's "Ask AI" widget
 * (src/components/dashboard/dashboard-ai.tsx's SUGGESTIONS) — kept in sync
 * by hand since the Raycast extension is a separate build from the main
 * app. Available as quick-start actions (⌘K) that fill the description
 * field, same idea as the dashboard's clickable suggestion chips.
 */
const SUGGESTIONS = [
  "Build a customer feedback form",
  "Create a job application form",
  "Make an event registration form with logic jumps",
];

export default function Command() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      await showToast({ style: Toast.Style.Failure, title: "Description can't be empty" });
      return;
    }

    setIsLoading(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Creating form..." });
    try {
      const result = await aiCreateForm(trimmed);
      await Clipboard.copy(result.publicUrl);
      toast.style = Toast.Style.Success;
      toast.title = "Form created";
      toast.message = `"${result.title}" — link copied to clipboard`;
      toast.primaryAction = {
        title: "Open in Browser",
        onAction: () => open(result.publicUrl),
      };
      await popToRoot();
    } catch (err) {
      const isAuthError = err instanceof OrbiformAuthError;
      toast.style = Toast.Style.Failure;
      toast.title = isAuthError ? "Orbiform session expired" : "Couldn't create form";
      toast.message = err instanceof Error ? err.message : String(err);
      toast.primaryAction = isAuthError ? { title: "Reconnect Orbiform", onAction: () => reconnect() } : undefined;
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Form" onSubmit={handleSubmit} />
          <ActionPanel.Section title="Quick Start">
            {SUGGESTIONS.map((suggestion) => (
              <Action key={suggestion} title={suggestion} onAction={() => setPrompt(suggestion)} />
            ))}
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="prompt"
        title="Form description"
        placeholder="e.g. Customer satisfaction survey, 5 questions, with a 1-5 rating and a comment field"
        value={prompt}
        onChange={setPrompt}
        autoFocus
      />
      <Form.Description text="Press ⌘K for quick-start examples, or just describe the form you want." />
    </Form>
  );
}
