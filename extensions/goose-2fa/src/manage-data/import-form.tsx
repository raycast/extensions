import { Action, ActionPanel, Form, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { readFileSync, statSync } from "node:fs";
import type { NewAccountInput } from "../../vendor/lib/types";
import { commit } from "../lib/commit";
import { t } from "../lib/i18n";
import { previewImport } from "../lib/vault-ops";
import { getVaultState } from "../lib/vault-store";

export function ImportForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle={t("Import from File", "从文件导入")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Import", "导入")}
            onSubmit={async (values: { files?: string[] }) => {
              const target = values.files?.[0];
              if (!target) {
                await showToast({ style: Toast.Style.Failure, title: t("Choose a backup file", "请选择备份文件") });
                return;
              }
              let text: string;
              try {
                const file = statSync(target);
                if (!file.isFile() || file.size > 5 * 1024 * 1024)
                  throw new Error(t("Invalid backup file", "备份文件无效"));
                text = readFileSync(target, "utf8");
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("Could Not Read File", "无法读取文件"),
                  message: t("Check the path, permissions and 5 MB limit.", "请检查文件路径、权限和 5MB 大小限制。"),
                });
                return;
              }
              if (!previewImport(text, getVaultState())) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("Could not parse backup file", "无法解析备份文件"),
                });
                return;
              }
              push(<ImportPreview text={text} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title={t("Backup File", "备份文件")} allowMultipleSelection={false} />
    </Form>
  );
}

function ImportPreview({ text }: { text: string }) {
  const { pop } = useNavigation();
  const preview = previewImport(text, getVaultState());
  if (!preview) return <List.EmptyView title={t("Could Not Parse Backup", "备份无法解析")} />;
  const current = getVaultState();
  const imported = preview.snapshot.accounts.slice(current.accounts.length);
  const groupCount = preview.snapshot.groups.length - current.groups.length;
  return (
    <List
      navigationTitle={t("Import Preview", "导入预览")}
      searchBarPlaceholder={t("Search accounts to import", "搜索待导入账户")}
    >
      <List.Section
        title={t(
          `Accounts: ${preview.added} new, ${preview.dupeCount} duplicates skipped`,
          `账户：新增 ${preview.added}，重复跳过 ${preview.dupeCount}`,
        )}
      >
        {imported.map((account: NewAccountInput, index) => (
          <List.Item
            key={`${account.issuer}:${account.name}:${index}`}
            icon={Icon.Key}
            title={account.note || account.name}
            subtitle={account.issuer}
          />
        ))}
      </List.Section>
      <List.Section title={t(`${groupCount} groups will be added`, `将新增 ${groupCount} 个分组`)}>
        {preview.snapshot.groups.slice(current.groups.length).map((group) => (
          <List.Item key={group.id} icon={Icon.Folder} title={group.name} />
        ))}
      </List.Section>
      <List.Item
        icon={Icon.Warning}
        title={t("Confirm Import", "确认导入")}
        subtitle={t(
          "Secrets are hidden; they will be available in your local data source after import.",
          "验证码密钥不会显示；导入后可在本机数据源中查看。",
        )}
        actions={
          <ActionPanel>
            <Action
              title={t(`Import ${preview.added} accounts`, `导入 ${preview.added} 个账户`)}
              icon={Icon.Download}
              onAction={async () => {
                const currentPreview = previewImport(text, getVaultState());
                if (!currentPreview) {
                  await showToast({ style: Toast.Style.Failure, title: t("Could Not Parse Backup", "备份无法解析") });
                  return;
                }
                const ok = await commit(
                  () => currentPreview.snapshot,
                  t(`Imported ${currentPreview.added} accounts`, `已导入 ${currentPreview.added} 个账户`),
                );
                if (ok) pop();
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
