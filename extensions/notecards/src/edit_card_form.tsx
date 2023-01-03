import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

type Props = {
  title: string;
  subtitle: string;
  onSubmit: ({ title, body }: { title: string; body: string }) => void;
};
export default function EditCardForm({ title: initialTitle, subtitle: initialBody, onSubmit }: Props) {
  const [title, setTitle] = useState<string | null>(initialTitle);
  const { pop } = useNavigation();
  const [body, setBody] = useState<string | null>(initialBody);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: { titleField: string; bodyField: string }) => {
              onSubmit({ title: values.titleField, body: values.bodyField });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="titleField"
        title="Title"
        placeholder="Enter subject of note"
        value={title ?? ""}
        onChange={(e) => setTitle(e)}
      />
      <Form.TextArea
        id="bodyField"
        title="Body"
        enableMarkdown
        autoFocus
        placeholder="Describe this note"
        value={body ?? ""}
        onChange={(e) => setBody(e)}
      />
    </Form>
  );
}
