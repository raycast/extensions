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
      JSON.parse(input);
      await showToast(Toast.Style.Success, "JSON is valid");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Invalid JSON: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Validate JSON" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="json" title="Enter your JSON" placeholder='{"key": "value"}' defaultValue={clipboardText} />
    </Form>
  );
}
