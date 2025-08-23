import { Form, ActionPanel, Action, Clipboard, showToast, Toast } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [input, setInput] = useState("");
  const output = input ? encodeURIComponent(input) : "";

  const handleCopy = async () => {
    if (output) {
      await Clipboard.copy(output);
      await showToast({
        style: Toast.Style.Success,
        title: "Copied!",
        message: "Encoded result copied to clipboard",
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
      <Form.TextArea id="input" title="Input" placeholder="Enter text to encode..." value={input} onChange={setInput} />
      <Form.Separator />
      <Form.TextArea id="output" title="Encoded Result" value={output} placeholder="Result will appear here..." />
    </Form>
  );
}
