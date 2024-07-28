import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

interface EditClipboardFormProps {
  name: string;
  initialContent: string;
  onEdit: (name: string, newContent: string) => void;
}

export function EditClipboardForm({ name, initialContent, onEdit }: EditClipboardFormProps) {
  const [content, setContent] = useState(initialContent);
  const { pop } = useNavigation();

  function handleSubmit() {
    onEdit(name, content);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Clipboard Name" value={name} />
      <Form.TextArea id="content" title="Content" value={content} onChange={setContent} />
    </Form>
  );
}
