import { Action, ActionPanel, Form, Icon, List, showToast, Toast, confirmAlert } from "@raycast/api";
import { useState } from "react";
import UnlockView from "./unlock";
import { vaultPath } from "./preferences";
import { groupsSorted } from "./query";
import { clearMaster, isUnlocked, loadOrThrow, persistVault } from "./session";
import { removeGroup, renameGroupRefs, upsertGroup, vaultExists } from "./vault";

export default function ManageGroupsCommand() {
  const dir = vaultPath();
  const [unlocked, setUnlocked] = useState(() => isUnlocked());
  const [tick, setTick] = useState(0);

  if (!unlocked) return <UnlockView dir={dir} onUnlocked={() => setUnlocked(true)} />;

  let vault;
  try {
    vault = loadOrThrow(dir);
  } catch {
    return <UnlockView dir={dir} onUnlocked={() => setUnlocked(true)} />;
  }

  const groups = groupsSorted(vault);

  return (
    <List navigationTitle="UniKey Groups" searchBarPlaceholder="Groups">
      <List.Section title="Create">
        <List.Item
          key="__create"
          title="New Group…"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="New Group"
                target={
                  <GroupNameForm
                    dir={dir}
                    existing={undefined}
                    onSaved={() => {
                      setTick((t) => t + 1);
                    }}
                  />
                }
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Groups">
        {groups.map((g) => (
          <List.Item
            key={g.name}
            title={g.name}
            subtitle={`${vault.entries.filter((e) => e.group === g.name).length} entries`}
            icon={Icon.Folder}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Rename"
                  target={
                    <GroupNameForm
                      dir={dir}
                      existing={g.name}
                      onSaved={() => {
                        setTick((t) => t + 1);
                      }}
                    />
                  }
                />
                <Action
                  title="Delete Group"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={async () => {
                    const confirmed = await confirmAlert({
                      title: `Delete group "${g.name}"?`,
                      message:
                        vault.entries.filter((e) => e.group === g.name).length > 0
                          ? "Entries in this group will be kept but moved to (no group)."
                          : "This group is empty.",
                    });
                    if (!confirmed) return;
                    const v = loadOrThrow(dir);
                    removeGroup(v, g.name);
                    persistVault(dir, v);
                    await showToast({ style: Toast.Style.Success, title: `Deleted ${g.name}` });
                    setTick((t) => t + 1);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {groups.length === 0 && <List.EmptyView title="No groups yet" description="Use groups to organise passwords" />}
    </List>
  );
}

function GroupNameForm(props: { dir: string; existing?: string; onSaved: () => void }) {
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { name: string }): Promise<boolean> {
    const name = values.name.trim().toLowerCase().replace(/\s+/g, "-");
    if (!name) {
      setError("Name is required");
      return false;
    }
    const vault = loadOrThrow(props.dir);
    if (props.existing === undefined) {
      const created = upsertGroup(vault, name);
      if (!created) {
        setError(`"${name}" already exists`);
        return false;
      }
    } else if (name !== props.existing) {
      renameGroupRefs(vault, props.existing, name);
      const gi = vault.groups.findIndex((g) => g.name === props.existing);
      if (gi >= 0) vault.groups[gi].name = name;
    }
    persistVault(props.dir, vault);
    await showToast({
      style: Toast.Style.Success,
      title: props.existing ? `Renamed to ${name}` : `Created ${name}`,
    });
    props.onSaved();
    return true;
  }

  return (
    <Form
      navigationTitle={props.existing ? "Rename Group" : "New Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="work"
        defaultValue={props.existing ?? ""}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}
