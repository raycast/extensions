import { ActionPanel, Form, Action, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { saveClipboardItem } from "./clipboardStorage";

export default function Command() {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  async function handleSubmit() {
    if (!name || !content) {
      showToast(Toast.Style.Failure, "Name and Content are required");
      return;
    }
    await saveClipboardItem(name, content);
    showToast(Toast.Style.Success, "Copied to named clipboard");
    setName("");
    setContent("");
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Copy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Clipboard Name" value={name} onChange={setName} />
      <Form.TextArea id="content" title="Content" value={content} onChange={setContent} />
    </Form>
  );
}
