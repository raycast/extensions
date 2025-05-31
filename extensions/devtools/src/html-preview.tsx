import React, { useState } from "react";
import { ActionPanel, Action, Form, Detail, useNavigation } from "@raycast/api";

function HtmlPreview({ html, onBack }: { html: string; onBack: () => void }) {
  return (
    <Detail
      navigationTitle="HTML Preview"
      markdown={`<div>${html}</div>`}
      actions={
        <ActionPanel>
          <Action title="Back to Edit" onAction={onBack} />
          <Action.CopyToClipboard title="Copy HTML" content={html} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const [input, setInput] = useState("<h1>Hello, world!</h1>\n<p>Type your HTML here...</p>");
  const { push, pop } = useNavigation();

  function handlePreview() {
    push(<HtmlPreview html={input} onBack={pop} />);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Preview HTML" onAction={handlePreview} shortcut={{ modifiers: ["cmd"], key: "enter" }} />
          <Action.CopyToClipboard title="Copy HTML" content={input} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="HTML Input"
        placeholder="Type or paste HTML here"
        value={input}
        onChange={setInput}
      />
    </Form>
  );
}
