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
import { t } from "./lib/i18n";

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
      title: t("mw.deleteConfirm", { name: w.name }),
      primaryAction: { title: t("common.delete"), style: Alert.ActionStyle.Destructive },
    });
    if (!ok) return;
    await deleteWorkspace(w.id);
    await refresh();
    await showToast({ style: Toast.Style.Success, title: t("mw.toast.deleted") });
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={t("mw.empty.title")}
        description={t("mw.empty.desc")}
        actions={
          <ActionPanel>
            <Action.Push title={t("mw.create")} icon={Icon.Plus} target={<WorkspaceForm onSaved={refresh} />} />
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
                title={t("mw.edit")}
                icon={Icon.Pencil}
                target={<WorkspaceForm workspace={w} onSaved={refresh} />}
              />
              <Action.Push title={t("mw.create")} icon={Icon.Plus} target={<WorkspaceForm onSaved={refresh} />} />
              <Action
                title={t("mw.delete")}
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
    if (!name) return void showToast({ style: Toast.Style.Failure, title: t("err.nameRequired") });
    if (!path) return void showToast({ style: Toast.Style.Failure, title: t("err.folderRequired") });

    const aliases = parseAliases(values.aliases);
    if (aliases.length === 0) return void showToast({ style: Toast.Style.Failure, title: t("err.aliasRequired") });
    if (aliases.includes("h")) return void showToast({ style: Toast.Style.Failure, title: t("err.hReserved") });

    let number: number | undefined;
    if (values.number.trim()) {
      number = Number(values.number.trim());
      if (!Number.isInteger(number))
        return void showToast({ style: Toast.Style.Failure, title: t("err.numberInteger") });
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
    await showToast({ style: Toast.Style.Success, title: workspace ? t("mw.toast.updated") : t("mw.toast.created") });
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("mw.save")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t("form.name")} placeholder="Ceramica" defaultValue={workspace?.name} />
      <Form.FilePicker
        id="path"
        title={t("form.folder")}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        defaultValue={workspace?.path ? [workspace.path] : undefined}
      />
      <Form.TextField
        id="aliases"
        title={t("form.aliases")}
        placeholder="cr, ceramica"
        info={t("form.aliases.info")}
        defaultValue={workspace?.aliases.join(", ")}
      />
      <Form.TextField
        id="number"
        title={t("form.number")}
        placeholder="Optional"
        info={t("form.number.info")}
        defaultValue={workspace?.number !== undefined ? String(workspace.number) : undefined}
      />
    </Form>
  );
}
