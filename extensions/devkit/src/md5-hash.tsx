import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { createHash } from "crypto";
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

    const hash = createHash("md5").update(input).digest("hex");
    await Clipboard.copy(hash);
    await showToast(Toast.Style.Success, "MD5 hash copied to clipboard");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Generate Md5 Hash" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="text" title="Enter your text" placeholder="Hello, World!" defaultValue={clipboardText} />
    </Form>
  );
}
