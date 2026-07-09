import { Form, ActionPanel, Action, Icon } from "@raycast/api";
import { useState } from "react";

export function TextInputForm(props: {
  onSubmit: (text: string) => void;
  submitTitle?: string;
  submitIcon?: Icon;
  title?: string;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={props.submitTitle ?? "Analyze"}
            icon={props.submitIcon ?? Icon.Microphone}
            onSubmit={(values: { text: string }) => props.onSubmit(values.text)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title={props.title ?? "English text"}
        placeholder={
          props.placeholder ?? "Paste a word or sentence to practice…"
        }
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
