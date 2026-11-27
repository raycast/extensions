import {
  Action,
  ActionPanel,
  Detail,
  Form,
  type LaunchProps,
} from "@raycast/api";
import { useState } from "react";
import CreateCommand from "./create-ground-packet";
import { receiveHandoff } from "./domain/receive";
export default function ReceiveHandoff(props: LaunchProps) {
  const [input, setInput] = useState<unknown>(props.launchContext?.handoff);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  if (input) {
    try {
      return <CreateCommand initialDraft={receiveHandoff(input)} />;
    } catch (e) {
      return (
        <Detail
          markdown={`# Handoff could not be opened\n\n${e instanceof Error ? e.message : String(e)}`}
          actions={
            <ActionPanel>
              <Action
                title="Paste Another Handoff"
                onAction={() => setInput(undefined)}
              />
            </ActionPanel>
          }
        />
      );
    }
  }
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Handoff"
            onSubmit={() => {
              try {
                const parsed: unknown = JSON.parse(text);
                receiveHandoff(parsed);
                setInput(parsed);
                setError("");
              } catch {
                setError("Paste valid structured handoff JSON.");
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Paste Copy Structured Handoff output from Lawful Splat. This opens a review form; it does not save or run AI." />
      <Form.TextArea
        id="handoff"
        title="Handoff JSON"
        value={text}
        onChange={setText}
        error={error}
      />
    </Form>
  );
}
