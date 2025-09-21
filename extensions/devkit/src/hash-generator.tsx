import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { createHash } from "crypto";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  // Async function is fine here
  async function handleSubmit(values: { text: string; algorithm: string }) {
    const input = values.text;
    const algorithm = values.algorithm;
    if (!input) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    const hash = createHash(algorithm).update(input).digest("hex");
    await Clipboard.copy(hash);
    await showToast(Toast.Style.Success, `${algorithm.toUpperCase()} hash copied to clipboard`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Hash" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Enter your text" placeholder="Hello, World!" defaultValue={clipboardText} />
      <Form.Dropdown id="algorithm" title="Hash Algorithm">
        <Form.Dropdown.Item value="sha1" title="SHA-1" />
        <Form.Dropdown.Item value="sha256" title="SHA-256" />
        <Form.Dropdown.Item value="sha512" title="SHA-512" />
      </Form.Dropdown>
    </Form>
  );
}
