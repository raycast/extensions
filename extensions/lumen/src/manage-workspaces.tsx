import {
  Action,
  ActionPanel,
  Alert,
  Form,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { randomUUID } from "node:crypto";
import {
  Workspace,
  deleteWorkspace,
  findCollisions,
  getWorkspaces,
  parseAliases,
  upsertWorkspace,
} from "./lib/workspaces";

export default function Command() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function refresh() {
    setWorkspaces(await getWorkspaces());
    setIsLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function remove(w: Workspace) {
    const ok = await confirmAlert({
      title: `Delete "${w.name}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteWorkspace(w.id);
    await refresh();
    await showToast({ style: Toast.Style.Success, title: "Workspace deleted" });
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={"No workspaces yet"}
        description={"Create your first workspace to scope Lumen searches."}
        actions={
          <ActionPanel>
            <Action.Push title={"Create Workspace"} icon={Icon.Plus} target={<WorkspaceForm onSaved={refresh} />} />
          </ActionPanel>
        }
      />
      {workspaces.map((w) => (
        <List.Item
          key={w.id}
          title={w.name}
          subtitle={w.aliases.join(", ")}
          accessories={[...(w.number !== undefined ? [{ tag: String(w.number) }] : []), { text: w.path }]}
          actions={
            <ActionPanel>
              <Action.Push
                title={"Edit Workspace"}
                icon={Icon.Pencil}
                target={<WorkspaceForm workspace={w} onSaved={refresh} />}
              />
              <Action.Push title={"Create Workspace"} icon={Icon.Plus} target={<WorkspaceForm onSaved={refresh} />} />
              <Action
                title={"Delete Workspace"}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={{ modifiers: ["ctrl"], key: "x" }}
                onAction={() => remove(w)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function WorkspaceForm({ workspace, onSaved }: { workspace?: Workspace; onSaved: () => void }) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { name: string; path: string[]; aliases: string; number: string }) {
    const name = values.name.trim();
    const path = values.path[0];
    if (!name) return void showToast({ style: Toast.Style.Failure, title: "Name is required" });
    if (!path) return void showToast({ style: Toast.Style.Failure, title: "Folder is required" });

    const aliases = parseAliases(values.aliases);
    if (aliases.length === 0)
      return void showToast({ style: Toast.Style.Failure, title: "At least one alias is required" });
    if (aliases.includes("h"))
      return void showToast({ style: Toast.Style.Failure, title: '"h" is reserved for Home search' });

    let number: number | undefined;
    if (values.number.trim()) {
      number = Number(values.number.trim());
      if (!Number.isInteger(number))
        return void showToast({ style: Toast.Style.Failure, title: "Number must be an integer" });
    }

    const w: Workspace = { id: workspace?.id ?? randomUUID(), name, path, aliases, number };
    const collisions = findCollisions(w, await getWorkspaces());
    if (collisions.length > 0) {
      const c = collisions[0];
      return void showToast({
        style: Toast.Style.Failure,
        title: t(c.field === "alias" ? "err.aliasUsed" : "err.numberUsed", { value: c.value, name: c.otherName }),
      });
    }

    await upsertWorkspace(w);
    onSaved();
    await showToast({ style: Toast.Style.Success, title: workspace ? "Workspace updated" : "Workspace created" });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={"Save Workspace"} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={"Name"} placeholder="Ceramica" defaultValue={workspace?.name} />
      <Form.FilePicker
        id="path"
        title={"Folder"}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={workspace?.path ? [workspace.path] : undefined}
      />
      <Form.TextField
        id="aliases"
        title={"Aliases"}
        placeholder="cr, ceramica"
        info={"Comma-separated. Lowercased on save. Must be unique across workspaces."}
        defaultValue={workspace?.aliases.join(", ")}
      />
      <Form.TextField
        id="number"
        title={"Number"}
        placeholder="Optional"
        info={"Optional unique integer shortcut."}
        defaultValue={workspace?.number !== undefined ? String(workspace.number) : undefined}
      />
    </Form>
  );
}
