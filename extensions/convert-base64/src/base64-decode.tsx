import { Action, ActionPanel, Form } from "@raycast/api";
import { useMemo, useState } from "react";
import { decode } from "js-base64";

export default function Command({ arguments: { input: initialInput } }: { arguments: { input?: string } }) {
  const [input, setInput] = useState(initialInput ?? "");

  const decoded = useMemo(() => (1000 < input.length ? null : decode(input)), [input]);

  return (
    <Form
      actions={
        decoded != null && (
          <ActionPanel title="Base64">
            <Action.CopyToClipboard title="Copy Base64" content={decoded} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.Paste content={decoded} />
          </ActionPanel>
        )
      }
    >
      <Form.TextArea
        id="nameField"
        title="Baset64"
        placeholder="Enter base64..."
        value={input}
        onChange={setInput}
        error={decoded == null ? "Please enter within 1000 characters." : undefined}
      />
      <Form.Description title="Original Text" text={decoded == null || decoded.length === 0 ? "-" : decoded} />
    </Form>
  );
}
