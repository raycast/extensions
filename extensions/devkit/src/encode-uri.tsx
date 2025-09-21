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

    const encoded = encodeURIComponent(input);
    await Clipboard.copy(encoded);
    await showToast(Toast.Style.Success, "Encoded URI copied to clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encode Uri" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="uri" title="Enter your URI" placeholder="https://example.com" defaultValue={clipboardText} />
    </Form>
  );
}
