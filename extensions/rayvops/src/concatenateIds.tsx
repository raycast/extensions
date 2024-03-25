import { Form, ActionPanel, Action, Detail, Clipboard } from "@raycast/api";
import React, { useState } from "react";

export default function ConcatenateIds() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handleConcatenate = async () => {
    const ids = input.split(/\s+/).filter(Boolean);
    const concatenated = `('${ids.join("', '")}')`;
    
    await Clipboard.copy(concatenated);

    setResult(concatenated);
  };

  if (result) {
    return (
      <Detail
        markdown={`# Concat result\n\n\`${result}\``}
        actions={
          <ActionPanel>
            <Action title="Copy result" onAction={() => Clipboard.copy(result)} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Concat and display" onAction={handleConcatenate} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="IDs to concat"
        placeholder="Enter Ids separated by spaces or line breaks"
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}
