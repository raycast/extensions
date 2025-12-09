import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";

interface CreateGroupFormProps {
  onCreate: (name: string) => void;
}

export default function CreateGroupForm({ onCreate }: CreateGroupFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState("");

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Group name is required",
      });
      return;
    }

    onCreate(name.trim());
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Group" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Group Name"
        placeholder="e.g., Morning News, Tech Sites"
        value={name}
        onChange={setName}
      />
    </Form>
  );
}
