import { Action, ActionPanel, Form } from "@raycast/api";
import { useMemo, useState } from "react";
import { encode } from "js-base64";

export default function Command({ arguments: { input: initialInput } }: { arguments: { input?: string } }) {
  const [input, setInput] = useState(initialInput ?? "");

  const encoded = useMemo(() => (1000 < input.length ? null : encode(input)), [input]);

  return (
    <Form
      actions={
        encoded != null && (
          <ActionPanel title="Base64">
            <Action.CopyToClipboard title="Copy Base64" content={encoded} shortcut={{ modifiers: ["cmd"], key: "c" }} />
            <Action.Paste content={encoded} />
          </ActionPanel>
        )
      }
    >
      <Form.TextArea
        id="nameField"
        title="plane text"
        placeholder="Enter plane text..."
        value={input}
        onChange={setInput}
        error={encoded == null ? "Please enter within 1000 characters." : undefined}
      />
      <Form.Description title="Base64" text={encoded == null || encoded.length === 0 ? "-" : encoded} />
    </Form>
  );
}
