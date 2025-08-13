import { Form, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [input, setInput] = useState("");
  let output = "";
  let error = "";

  try {
    output = input ? decodeURIComponent(input) : "";
  } catch {
    error = "Invalid encoded URI Component";
  }

  const handleCopy = async () => {
    if (output) {
      await Clipboard.copy(output);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied!",
        message: "Decoded result copied to clipboard",
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Copy Result" onAction={handleCopy} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Input"
        placeholder="Enter encoded text to decode..."
        value={input}
        onChange={setInput}
        error={error}
      />
      <Form.Separator />
      <Form.TextArea id="output" title="Decoded Result" value={output} placeholder="Result will appear here..." />
    </Form>
  );
}
