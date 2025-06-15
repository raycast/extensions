import { useState } from "react";
import { ActionPanel, Action, Form } from "@raycast/api";
import { v4 as uuidv4, v7 as uuidv7 } from "uuid";

export default function Command() {
  const [uuid4, setUuid4] = useState(uuidv4());
  const [uuid7, setUuid7] = useState(uuidv7());

  function regenerate() {
    setUuid4(uuidv4());
    setUuid7(uuidv7());
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action title="Regenerate" onAction={regenerate} shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }} />
          <Action.CopyToClipboard title="Copy UUID v4" content={uuid4} />
          <Action.CopyToClipboard title="Copy UUID v7" content={uuid7} />
        </ActionPanel>
      }
    >
      <Form.TextField id="uuid4" title="UUID v4" value={uuid4} onChange={() => {}} />
      <Form.TextField id="uuid7" title="UUID v7" value={uuid7} onChange={() => {}} />
    </Form>
  );
}
