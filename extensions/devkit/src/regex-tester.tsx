import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";

export default function Command() {
  const [clipboardText, setClipboardText] = useState("");

  useEffect(() => {
    Clipboard.readText().then((text) => setClipboardText(text || ""));
  }, []);

  async function handleSubmit(values: { regex: string; text: string; flags: string }) {
    const regexStr = values.regex;
    const text = values.text;
    const flags = values.flags;
    if (!regexStr || !text) {
      await showToast(Toast.Style.Failure, "No input provided");
      return;
    }

    try {
      const regex = new RegExp(regexStr, flags);
      const matches = text.match(regex);
      const result = matches ? matches.join("\n") : "No matches";
      await Clipboard.copy(result);
      await showToast(Toast.Style.Success, "Regex test results copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Invalid regex: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Test Regex" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="regex" title="Regular Expression" placeholder="[a-z]+" />
      <Form.TextField id="flags" title="Flags" placeholder="g" defaultValue="g" />
      <Form.TextArea id="text" title="Test Text" defaultValue={clipboardText} />
    </Form>
  );
}
