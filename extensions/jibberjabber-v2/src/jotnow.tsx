import {
  Form,
  ActionPanel,
  Action,
  popToRoot,
  Clipboard,
  showHUD,
} from "@raycast/api";
import { useState } from "react";

export default function JotNow() {
  const [text, setText] = useState("");

  async function copyAndClose() {
    if (!text.trim()) return;
    await Clipboard.copy(text);
    await showHUD("Copied to clipboard");
    popToRoot();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Copy to Clipboard"
            onAction={copyAndClose}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
          />
          <Action
            title="Clear"
            onAction={() => setText("")}
            shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title=""
        placeholder="Start typing…"
        value={text}
        onChange={setText}
      />
    </Form>
  );
}
