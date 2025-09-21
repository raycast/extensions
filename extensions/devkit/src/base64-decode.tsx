import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  // Async function is fine here
  async function handleSubmit(values: { base64: string }) {
    const input = values.base64;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const decoded = Buffer.from(input, "base64").toString("utf8");
      await Clipboard.copy(decoded);
      await showToast(Toast.Style.Success, "Base64 decoded text copied to clipboard");
    } catch {
      await showToast(Toast.Style.Failure, "Invalid Base64 string");
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decode from Base64" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="base64"
        title="Enter your Base64 string"
        placeholder="SGVsbG8sIFdvcmxkIQ=="
        defaultValue={clipboardText}
      />
    </Form>
  );
}
