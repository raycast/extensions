import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { json: string }) {
    const input = values.json;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, 2);
      await Clipboard.copy(formatted);
      await showToast(Toast.Style.Success, "Formatted JSON copied to clipboard");
    } catch {
      await showToast(Toast.Style.Failure, "Invalid JSON");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Format JSON" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="json" title="Enter your JSON" placeholder='{"key": "value"}' defaultValue={clipboardText} />
    </Form>
  );
}
