import { Form, ActionPanel, showToast, Toast, Clipboard, Action } from "@raycast/api";
import { useState, useEffect } from "react";
import toTypeScript from "json-to-ts";

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
      const parsed = JSON.parse(input);
      const interfaces = toTypeScript(parsed);
      const result = interfaces.join("\n\n");
      await Clipboard.copy(result);
      await showToast(Toast.Style.Success, "TypeScript interfaces copied to clipboard");
    } catch (error) {
      await showToast(Toast.Style.Failure, `Failed to convert: ${(error as Error).message}`);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Convert to Typescript" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="json"
        title="Enter JSON"
        placeholder='{"name": "John", "age": 30}'
        defaultValue={clipboardText}
      />
    </Form>
  );
}
