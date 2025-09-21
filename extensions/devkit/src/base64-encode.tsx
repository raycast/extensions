import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  // Async function is fine here
  async function handleSubmit(values: { text: string }) {
    const input = values.text;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    const encoded = Buffer.from(input, "utf8").toString("base64");
    await Clipboard.copy(encoded);
    await showToast(Toast.Style.Success, "Base64 encoded text copied to clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Encode to Base64" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Enter your text" placeholder="Hello, World!" defaultValue={clipboardText} />
    </Form>
  );
}
