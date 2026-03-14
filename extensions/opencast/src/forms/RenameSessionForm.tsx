import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";

type RenameSessionFormProps = {
  initialTitle: string;
  onSubmit: (title: string) => Promise<void>;
};

export function RenameSessionForm(props: RenameSessionFormProps) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(props.initialTitle);

  return (
    <Form
      navigationTitle="Rename Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={async () => {
              await props.onSubmit(title.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="Title"
        value={title}
        onChange={setTitle}
      />
    </Form>
  );
}
