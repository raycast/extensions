import { Action, ActionPanel, Detail, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useSelectedText } from "../hooks";
import { assertNoApiKeysInPrompt } from "../lib/OpenAI";
import type { Action as StoreAction } from "../types";
import ExecuteAction from "./ExecuteAction";

interface Props {
  action: StoreAction;
}

function ActionTextForm({ action }: Props) {
  const { push } = useNavigation();
  const [text, setText] = useState("");
  const [error, setError] = useState<string>();

  const submit = () => {
    if (!text.trim()) {
      setError("Enter text to run this action.");
      return;
    }
    try {
      assertNoApiKeysInPrompt(text, action.systemPrompt);
      push(<ExecuteAction action={action} prompt={text} />);
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <Form
      navigationTitle={action.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Run Action" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Enter the text you want to run this action on." />
      <Form.TextArea
        id="text"
        title="Text"
        placeholder="Paste or enter your text…"
        value={text}
        error={error}
        onChange={(value) => {
          setText(value);
          setError(undefined);
        }}
      />
    </Form>
  );
}

export default function SelectedTextAction({ action }: Props) {
  const selection = useSelectedText();
  if (selection.success === undefined) {
    return <Detail isLoading />;
  }
  if (selection.success) {
    try {
      assertNoApiKeysInPrompt(selection.text, action.systemPrompt);
      return <ExecuteAction action={action} prompt={selection.text} />;
    } catch {
      // Never prefill the manual input with credentials from a stale selection.
    }
  }
  return <ActionTextForm action={action} />;
}
