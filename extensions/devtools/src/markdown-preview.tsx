import React, { useState } from "react";
import { ActionPanel, Action, Form, Detail, useNavigation } from "@raycast/api";

function MarkdownPreview({ markdown, onBack }: { markdown: string; onBack: () => void }) {
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Back to Edit" onAction={onBack} />
          <Action.CopyToClipboard title="Copy Markdown" content={markdown} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [input, setInput] = useState("# Heading 1\n\nType your markdown here...");
  const { push, pop } = useNavigation();

  function handlePreview() {
    push(<MarkdownPreview markdown={input} onBack={pop} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Preview Markdown"
            onAction={handlePreview}
            shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
          />
          <Action.CopyToClipboard title="Copy Markdown" content={input} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="Markdown Input"
        placeholder="Type or paste markdown here"
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}
