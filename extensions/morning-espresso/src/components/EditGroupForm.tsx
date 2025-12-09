import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { TabGroup } from "../manage-tab-groups";

interface EditGroupFormProps {
  group: TabGroup;
  onEdit: (groupId: string, newName: string) => void;
}

export default function EditGroupForm({ group, onEdit }: EditGroupFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(group.name);

  const handleSubmit = () => {
    if (!name.trim()) {
      showToast({
        style: Toast.Style.Failure,
        title: "Group name is required",
      });
      return;
    }

    onEdit(group.id, name.trim());
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Changes" onSubmit={handleSubmit} />
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
