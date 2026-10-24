import { Action, ActionPanel, Form, Icon, Keyboard, List, useNavigation } from "@raycast/api";
import type { AccountData, VaultGroup } from "../../vendor/lib/types";
import { commit } from "../lib/commit";
import { t } from "../lib/i18n";
import { addGroup, removeGroup, renameGroup } from "../lib/vault-ops";

export function NewGroupItem({ push }: { push: ReturnType<typeof useNavigation>["push"] }) {
  return (
    <List.Item
      icon={Icon.Plus}
      title={t("New Group", "新建分组")}
      actions={
        <ActionPanel>
          <Action
            title={t("New Group", "新建分组")}
            icon={Icon.Plus}
            onAction={() => push(<GroupForm mode="create" />)}
          />
        </ActionPanel>
      }
    />
  );
}

export function GroupItem({
  group,
  accounts,
  push,
}: {
  group: VaultGroup;
  accounts: AccountData[];
  push: ReturnType<typeof useNavigation>["push"];
}) {
  return (
    <List.Item
      key={group.id}
      icon={Icon.Folder}
      title={group.name}
      subtitle={t(
        `${accounts.filter((account) => account.groupId === group.id).length} accounts`,
        `${accounts.filter((account) => account.groupId === group.id).length} 个账户`,
      )}
      actions={
        <ActionPanel>
          <Action
            title={t("Rename Group", "重命名分组")}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => push(<GroupForm mode="rename" group={group} />)}
          />
          <Action
            title={t("Delete Group (accounts become ungrouped)", "删除分组（账户回到未分组）")}
            icon={Icon.Trash}
            shortcut={Keyboard.Shortcut.Common.Remove}
            style={Action.Style.Destructive}
            onAction={() =>
              void commit((snapshot) => removeGroup(snapshot, group.id), t("Group deleted", "已删除分组"))
            }
          />
        </ActionPanel>
      }
    />
  );
}

function GroupForm({ mode, group }: { mode: "create" | "rename"; group?: VaultGroup }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={mode === "create" ? t("New Group", "新建分组") : t("Rename Group", "重命名分组")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? t("Create", "新建") : t("Save", "保存")}
            onSubmit={async (values: FormValues) => {
              const name = values.name ?? "";
              const ok =
                mode === "create"
                  ? await commit((snapshot) => addGroup(snapshot, name).snapshot, t("Group created", "已新建分组"))
                  : await commit(
                      (snapshot) => renameGroup(snapshot, group?.id ?? "", name),
                      t("Group renamed", "已重命名分组"),
                    );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("Group Name", "分组名")}
        defaultValue={group?.name}
        placeholder={t("Work", "工作")}
      />
    </Form>
  );
}

interface FormValues {
  name?: string;
}
