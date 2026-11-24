import { Action, ActionPanel, Icon, Keyboard, List, type useNavigation } from "@raycast/api";
import type { AccountData, VaultGroup } from "../../vendor/lib/types";
import AccountForm from "../account-form";
import { AccountExportAction } from "../account-export";
import { commit } from "../lib/commit";
import { t } from "../lib/i18n";
import { moveToTrash, setAccountGroup } from "../lib/vault-ops";

export default function AccountItem({
  account,
  groups,
  push,
}: {
  account: AccountData;
  groups: VaultGroup[];
  push: ReturnType<typeof useNavigation>["push"];
}) {
  const groupName = account.groupId ? groups.find((group) => group.id === account.groupId)?.name : undefined;
  return (
    <List.Item
      icon={account.type === "hotp" ? Icon.Hashtag : Icon.Key}
      title={account.note || account.name}
      subtitle={[account.issuer, groupName].filter(Boolean).join(" · ")}
      accessories={[{ text: account.type.toUpperCase() }]}
      actions={
        <ActionPanel>
          <Action
            title={t("Edit Note & Name", "编辑备注与名称")}
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            onAction={() => push(<AccountForm mode="edit" account={account} />)}
          />
          <AccountExportAction accountId={account.id} />
          <ActionPanel.Section title={t("Move to Group", "移动到分组")}>
            <Action
              title={t("Ungrouped", "未分组")}
              icon={Icon.Folder}
              onAction={() =>
                void commit((snapshot) => setAccountGroup(snapshot, account.id, null), t("Account moved", "已移动账户"))
              }
            />
            {groups.map((group) => (
              <Action
                key={group.id}
                title={group.name}
                icon={Icon.Folder}
                onAction={() =>
                  void commit(
                    (snapshot) => setAccountGroup(snapshot, account.id, group.id),
                    t("Account moved", "已移动账户"),
                  )
                }
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("Move to Trash", "移入回收站")}
              icon={Icon.Trash}
              shortcut={Keyboard.Shortcut.Common.Remove}
              style={Action.Style.Destructive}
              onAction={() =>
                void commit((snapshot) => moveToTrash(snapshot, account.id), t("Moved to Trash", "已移入回收站"))
              }
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
