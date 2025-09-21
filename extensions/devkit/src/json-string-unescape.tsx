import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { text: string }) {
    const input = values.text;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const unescaped = JSON.parse(input);
      await Clipboard.copy(unescaped);
      await showToast(Toast.Style.Success, "Unescaped JSON string copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to unescape: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Unescape JSON String" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Enter JSON string to unescape"
        placeholder='"Hello \\"world\\""'
        defaultValue={clipboardText}
      />
    </Form>
  );
}
