import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import type { PromptTarget } from "./core/prompt-store";

export interface PromptFormValues {
  title: string;
  summary: string;
  body: string;
  target: PromptTarget;
  tags: string;
  aliases: string;
  searchTerms: string;
}

interface PromptFormProps {
  navigationTitle: string;
  submitTitle: string;
  initial?: PromptFormValues;
  onSubmit: (values: PromptFormValues) => Promise<void>;
}

const EMPTY_FORM: PromptFormValues = {
  title: "",
  summary: "",
  body: "",
  target: "generic",
  tags: "",
  aliases: "",
  searchTerms: "",
};

export function PromptForm({
  navigationTitle,
  submitTitle,
  initial = EMPTY_FORM,
  onSubmit,
}: PromptFormProps) {
  const [showDetails, setShowDetails] = useState(false);

  async function submit(values: PromptFormValues) {
    try {
      await onSubmit({
        ...initial,
        ...values,
        summary: values.summary ?? initial.summary,
        tags: values.tags ?? initial.tags,
        aliases: values.aliases ?? initial.aliases,
        searchTerms: values.searchTerms ?? initial.searchTerms,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast(Toast.Style.Failure, "Could Not Save Prompt", message);
    }
  }

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={submitTitle} onSubmit={submit} />
          {!showDetails ? (
            <Action
              title="Add Optional Details"
              onAction={() => setShowDetails(true)}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="body"
        title="Prompt"
        defaultValue={initial.body}
        placeholder="Write or paste the prompt…"
      />
      <Form.Description
        title="Private and Unchanged"
        text="Saved locally exactly as entered. No AI model is called."
      />
      <Form.TextField
        id="title"
        title="Title"
        defaultValue={initial.title}
        placeholder="Diagnose a failing API request"
      />
      <Form.Dropdown id="target" title="Use With" defaultValue={initial.target}>
        <Form.Dropdown.Item title="Generic" value="generic" />
        <Form.Dropdown.Item title="Codex" value="codex" />
        <Form.Dropdown.Item title="Claude Code" value="claude-code" />
      </Form.Dropdown>
      {showDetails ? (
        <>
          <Form.Separator />
          <Form.Description
            title="Optional Details"
            text="A summary and search phrases make this prompt easier to find. Leave them blank to keep this simple."
          />
          <Form.TextField
            id="summary"
            title="Summary"
            defaultValue={initial.summary}
            placeholder="Generated locally from the prompt when blank"
          />
          <Form.TextField
            id="tags"
            title="Tags"
            defaultValue={initial.tags}
            placeholder="debugging, api, backend"
          />
          <Form.TextField
            id="aliases"
            title="Also Known As"
            defaultValue={initial.aliases}
            placeholder="fix flaky endpoint, investigate intermittent API"
          />
          <Form.TextField
            id="searchTerms"
            title="More Search Phrases"
            defaultValue={initial.searchTerms}
            placeholder="request failure, endpoint bug, unreliable service call"
          />
          <Form.Description text="Separate phrases with commas." />
        </>
      ) : null}
    </Form>
  );
}

export function commaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
