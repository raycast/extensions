import { useState } from "react";
import { ActionPanel, Form, Action } from "@raycast/api";
import DisplayText from "./display-text";

export default function EnterText() {
  const [inputText, setInputText] = useState<string>("");

  function handleSubmit(values: { text: string }) {
    setInputText(values.text);
  }

  return inputText ? (
    <DisplayText inputText={inputText} />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit Text" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Enter Text" placeholder="Enter text to display" />
    </Form>
  );
}
