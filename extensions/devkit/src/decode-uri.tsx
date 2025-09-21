import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  // Async function is fine here
  async function handleSubmit(values: { uri: string }) {
    const input = values.uri;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const decoded = decodeURIComponent(input);
      await Clipboard.copy(decoded);
      await showToast(Toast.Style.Success, "Decoded URI copied to clipboard");
    } catch {
      await showToast(Toast.Style.Failure, "Invalid URI encoding");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode Uri" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="uri"
        title="Enter your encoded URI"
        placeholder="https%3A%2F%2Fexample.com"
        defaultValue={clipboardText}
      />
    </Form>
  );
}
