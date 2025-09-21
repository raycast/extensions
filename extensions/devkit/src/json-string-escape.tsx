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
      const escaped = JSON.stringify(input);
      await Clipboard.copy(escaped);
      await showToast(Toast.Style.Success, "Escaped JSON string copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to escape: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Escape JSON String" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="text"
        title="Enter string to escape"
        placeholder='Hello "world"'
        defaultValue={clipboardText}
      />
    </Form>
  );
}
