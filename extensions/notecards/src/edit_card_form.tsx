import { Action, ActionPanel, Color, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { noteColors } from "./datastore";

type Props = {
  title: string;
  subtitle: string;
  color: string;
  onSubmit: ({ title, body, color }: { title: string; body: string; color: string }) => void;
};

export default function EditCardForm({
  title: initialTitle,
  subtitle: initialBody,
  color: initialColor,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState<string | null>(initialTitle);
  const { pop } = useNavigation();
  const [body, setBody] = useState<string | null>(initialBody);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values: { titleField: string; bodyField: string; color: string }) => {
              console.log(values);
              onSubmit({ title: values.titleField, body: values.bodyField, color: values.color });
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
      <Form.Dropdown id="color" title="Select card color" defaultValue={initialColor}>
        {Object.keys(noteColors).map((color) => {
          return (
            <Form.Dropdown.Item
              key={color}
              value={color}
              title={color}
              icon={{ source: Icon.CircleFilled, tintColor: noteColors[color] }}
            />
          );
        })}
      </Form.Dropdown>
    </Form>
  );
}
