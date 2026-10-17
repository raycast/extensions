import { useState } from "react";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { ScheduleGroup } from "../types";

export function CreateGroupForm({ onSubmit }: { onSubmit: (name: string) => void }) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Group"
            icon={Icon.Check}
            onSubmit={async (values: { name: string }) => {
              const submittedName = values.name;
              if (!submittedName?.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Group name is required" });
                return;
              }
              onSubmit(submittedName.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Group Name" placeholder="e.g., Fall 2024" />
    </Form>
  );
}

export function RenameGroupForm({ group, onSubmit }: { group: ScheduleGroup; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(group.name);
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={`Rename "${group.name}"`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Name"
            icon={Icon.Check}
            onSubmit={async () => {
              if (!name.trim()) {
                await showToast({ style: Toast.Style.Failure, title: "Group name is required" });
                return;
              }
              onSubmit(name.trim());
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Group Name"
        placeholder="e.g., Fall 2024"
        value={name}
        onChange={setName}
        autoFocus
      />
    </Form>
  );
}
