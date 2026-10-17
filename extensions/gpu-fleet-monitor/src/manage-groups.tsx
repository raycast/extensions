import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
import { HostGroup, addGroup, updateGroup, deleteGroup, generateGroupId } from "./lib/groups";

interface ManageGroupsProps {
  groups: HostGroup[];
  onGroupsChanged: () => void;
}

export function ManageGroupsView({ groups, onGroupsChanged }: ManageGroupsProps) {
  const { push } = useNavigation();

  return (
    <List navigationTitle="Manage Groups">
      {groups.length === 0 && (
        <List.EmptyView
          title="No groups"
          description="Create a group to organize your hosts."
          actions={
            <ActionPanel>
              <Action
                title="Create Group"
                icon={Icon.Plus}
                onAction={() =>
                  push(
                    <GroupForm
                      onSave={async (g) => {
                        await addGroup(g);
                        onGroupsChanged();
                      }}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}
      {groups.map((group) => (
        <List.Item
          key={group.id}
          icon={Icon.Tag}
          title={group.name}
          subtitle={groupSubtitle(group)}
          actions={
            <ActionPanel>
              <Action
                title="Edit Group"
                icon={Icon.Pencil}
                onAction={() =>
                  push(
                    <GroupForm
                      initial={group}
                      onSave={async (g) => {
                        await updateGroup(g);
                        onGroupsChanged();
                      }}
                    />,
                  )
                }
              />
              <Action
                title="Create Group"
                icon={Icon.Plus}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() =>
                  push(
                    <GroupForm
                      onSave={async (g) => {
                        await addGroup(g);
                        onGroupsChanged();
                      }}
                    />,
                  )
                }
              />
              <Action
                title="Delete Group"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={async () => {
                  if (
                    await confirmAlert({
                      title: `Delete "${group.name}"?`,
                      message: "Hosts will not be deleted, only the group assignment.",
                      primaryAction: {
                        title: "Delete",
                        style: Alert.ActionStyle.Destructive,
                      },
                    })
                  ) {
                    await deleteGroup(group.id);
                    onGroupsChanged();
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Deleted "${group.name}"`,
                    });
                  }
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function groupSubtitle(group: HostGroup): string {
  const parts: string[] = [];
  if (group.patterns.length > 0) {
    parts.push(`${group.patterns.length} pattern${group.patterns.length > 1 ? "s" : ""}`);
  }
  if (group.identityFiles.length > 0) {
    parts.push(`${group.identityFiles.length} identity file${group.identityFiles.length > 1 ? "s" : ""}`);
  }
  return parts.length > 0 ? parts.join(", ") : "No rules";
}

interface GroupFormProps {
  initial?: HostGroup;
  onSave: (group: HostGroup) => Promise<void>;
}

function GroupForm({ initial, onSave }: GroupFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(initial?.name || "");
  const [patterns, setPatterns] = useState(initial?.patterns.join(", ") || "");
  const [identityFiles, setIdentityFiles] = useState(initial?.identityFiles.join(", ") || "");

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Name required",
      });
      return;
    }

    const group: HostGroup = {
      id: initial?.id || generateGroupId(),
      name: trimmedName,
      patterns: patterns
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      identityFiles: identityFiles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };

    await onSave(group);
    await showToast({
      style: Toast.Style.Success,
      title: initial ? `Updated "${trimmedName}"` : `Created "${trimmedName}"`,
    });
    pop();
  }

  return (
    <Form
      navigationTitle={initial ? `Edit ${initial.name}` : "Create Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initial ? "Save Changes" : "Create Group"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Group Name" placeholder="My Group" value={name} onChange={setName} />
      <Form.TextField
        id="patterns"
        title="Host Patterns"
        placeholder="gpu-*, ml-server-*"
        value={patterns}
        onChange={setPatterns}
        info="Comma-separated glob patterns. Hosts matching any pattern are auto-assigned to this group."
      />
      <Form.TextField
        id="identityFiles"
        title="Identity Files"
        placeholder="~/.ssh/work_key, ~/.ssh/other_key"
        value={identityFiles}
        onChange={setIdentityFiles}
        info="Comma-separated SSH identity file paths. Hosts using these keys are auto-assigned to this group."
      />
    </Form>
  );
}
