import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { AccountData } from "../../vendor/lib/types";
import { commit } from "../lib/commit";
import { t } from "../lib/i18n";
import { deleteForever, emptyTrash, restoreFromTrash } from "../lib/vault-ops";

export function EmptyTrashItem() {
  return (
    <List.Item
      icon={Icon.Trash}
      title={t("Empty Trash", "清空回收站")}
      subtitle={t("Items older than 30 days are removed on load", "30 天前的条目在每次载入时自动清理")}
      actions={
        <ActionPanel>
          <Action
            title={t("Empty Trash", "清空回收站")}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={() => void commit((snapshot) => emptyTrash(snapshot), t("Trash emptied", "回收站已清空"))}
          />
        </ActionPanel>
      }
    />
  );
}

export function TrashItem({ account }: { account: AccountData }) {
  return (
    <List.Item
      key={account.id}
      icon={Icon.Trash}
      title={account.note || account.name}
      subtitle={t(
        `${account.issuer} · Deleted ${new Date(account.deletedAt ?? 0).toLocaleString("en-US")}`,
        `${account.issuer} · 删除于 ${new Date(account.deletedAt ?? 0).toLocaleString("zh-CN")}`,
      )}
      actions={
        <ActionPanel>
          <Action
            title={t("Restore Account", "恢复账户")}
            icon={Icon.ArrowCounterClockwise}
            onAction={() =>
              void commit((snapshot) => restoreFromTrash(snapshot, account.id), t("Account restored", "已恢复账户"))
            }
          />
          <Action
            title={t("Delete Permanently", "永久删除")}
            icon={Icon.DeleteDocument}
            style={Action.Style.Destructive}
            onAction={() =>
              void commit((snapshot) => deleteForever(snapshot, account.id), t("Permanently deleted", "已永久删除"))
            }
          />
        </ActionPanel>
      }
    />
  );
}
