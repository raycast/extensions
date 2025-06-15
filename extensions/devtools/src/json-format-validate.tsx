import React, { useState } from "react";
import { ActionPanel, Action, Form, showToast, Toast } from "@raycast/api";

export default function Command() {
  const [input, setInput] = useState("");
  const [spaces, setSpaces] = useState("2");
  const [error, setError] = useState("");

  function handleFormat() {
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, Number(spaces));
      setInput(formatted);
      setError("");
      showToast({ style: Toast.Style.Success, title: "Valid JSON!" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Invalid JSON";
      setError(errorMessage);
      showToast({ style: Toast.Style.Failure, title: "Invalid JSON", message: errorMessage });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Format/Validate" onAction={handleFormat} />
          <Action.CopyToClipboard title="Copy Input" content={input} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="input" title="JSON Input" placeholder="Enter JSON here" value={input} onChange={setInput} />
      <Form.Dropdown id="spaces" title="Indentation" value={spaces} onChange={setSpaces}>
        <Form.Dropdown.Item value="2" title="2 spaces" />
        <Form.Dropdown.Item value="4" title="4 spaces" />
        <Form.Dropdown.Item value="0" title="No spaces (minified)" />
      </Form.Dropdown>
      {error && <Form.Description title="Error" text={error} />}
    </Form>
  );
}
