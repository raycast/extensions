import { Form, ActionPanel, Action } from "@raycast/api";
import { useState } from "react";

export default function Command() {
  const [strLength, setStrLength] = useState(0);

  function handleChange(value: string) {
    setStrLength(value.length);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={strLength} title="Copy length to Clipboard"
                                  shortcut={{ modifiers: ["cmd"], key: "." }} />
        </ActionPanel>
      }
    >
      <Form.TextField id="str" placeholder="Enter string" defaultValue="" onChange={handleChange} />
      <Form.Description text={"String length: " + strLength.toString()} />
    </Form>
  );
}
