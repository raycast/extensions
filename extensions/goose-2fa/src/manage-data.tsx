import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { t } from "./lib/i18n";
import { useVaultSnapshot } from "./lib/vault-store";
import AccountItem from "./manage-data/account-item";
import DataSourceItem from "./manage-data/data-source-item";
import ExportForm from "./manage-data/export-form";
import { GroupItem, NewGroupItem } from "./manage-data/group-items";
import { ImportForm } from "./manage-data/import-form";
import { EmptyTrashItem, TrashItem } from "./manage-data/trash-items";

export { ImportForm } from "./manage-data/import-form";

export default function ManageData() {
  const vault = useVaultSnapshot();
  const { push } = useNavigation();

  return (
    <List
      navigationTitle={t("Settings & Data", "设置与数据")}
      isLoading={vault.status === "loading" || vault.syncStatus === "writing"}
      searchBarPlaceholder={t("Search accounts or groups", "搜索账户或分组")}
    >
      <List.Section title={t("Data Source", "数据源")}>
        <DataSourceItem vault={vault} push={push} />
      </List.Section>

      <List.Section title={t(`Accounts (${vault.accounts.length})`, `账户 (${vault.accounts.length})`)}>
        {vault.accounts.map((account) => (
          <AccountItem key={account.id} account={account} groups={vault.groups} push={push} />
        ))}
      </List.Section>

      <List.Section title={t(`Groups (${vault.groups.length})`, `分组 (${vault.groups.length})`)}>
        <NewGroupItem push={push} />
        {vault.groups.map((group) => (
          <GroupItem key={group.id} group={group} accounts={vault.accounts} push={push} />
        ))}
      </List.Section>

      <List.Section title={t(`Trash (${vault.trash.length})`, `回收站 (${vault.trash.length})`)}>
        <EmptyTrashItem />
        {vault.trash.map((account) => (
          <TrashItem key={account.id} account={account} />
        ))}
      </List.Section>

      <List.Section title={t("Import & Export", "导入导出")}>
        <List.Item
          icon={Icon.Upload}
          title={t("Import from File", "从文件导入")}
          actions={
            <ActionPanel>
              <Action
                title={t("Choose Backup File", "选择备份文件")}
                icon={Icon.Upload}
                onAction={() => push(<ImportForm />)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.SaveDocument}
          title={t("Export to File", "导出到文件")}
          actions={
            <ActionPanel>
              <Action
                title={t("Choose Export Path", "选择导出路径")}
                icon={Icon.SaveDocument}
                onAction={() => push(<ExportForm />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
