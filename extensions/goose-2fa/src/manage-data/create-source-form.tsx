import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { realpathSync, statSync } from "node:fs";
import path from "node:path";
import { exportAsSyncJson } from "../../vendor/lib/data-transfer";
import { t } from "../lib/i18n";
import { resolveVaultPath, writeVaultFile } from "../lib/vault-file";
import { getVaultState, selectCreatedSource } from "../lib/vault-store";

export default function CreateSourceForm() {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={t("Save Current Data as a Sync File", "保存当前数据为同步文件")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Save and Use This File", "保存并使用此文件")}
            onSubmit={async (values: { directory?: string[]; fileName?: string }) => {
              const directory = values.directory?.[0];
              const name = values.fileName?.trim() || "goose-2fa.json";
              if (!directory || !path.isAbsolute(directory) || !/^[^/\\\0]+\.json$/i.test(name)) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("Choose a folder and enter a .json filename", "请选择目录并填写 .json 文件名"),
                });
                return;
              }
              try {
                if (!statSync(directory).isDirectory()) throw new Error(t("Folder does not exist", "目录不存在"));
                const target = resolveVaultPath(path.join(realpathSync.native(directory), name));
                if (getVaultState().localBroken)
                  throw new Error(
                    t(
                      "Local vault is corrupted; incomplete data cannot be written to a new file",
                      "本地库已损坏；不能把不完整数据写成新文件",
                    ),
                  );
                const current = getVaultState();
                const result = await writeVaultFile(
                  target,
                  exportAsSyncJson(current.accounts, current.groups, current.trash),
                  null,
                  true,
                );
                if (result.status !== "ok")
                  throw new Error(
                    result.status === "conflict"
                      ? t("File already exists; select it in extension preferences", "文件已存在，请在扩展设置中选择它")
                      : t(
                          "Could not create file; check folder permissions or write lock",
                          "无法创建文件，请检查目录权限或写入锁",
                        ),
                  );
                await selectCreatedSource(target);
                await showToast({
                  style: Toast.Style.Success,
                  title: t("Data source created", "已新建数据源"),
                  message: target,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("Creation Failed", "新建失败"),
                  message: error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="directory"
        title={t("Save Folder", "保存目录")}
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
      <Form.TextField id="fileName" title={t("Filename", "文件名")} defaultValue="goose-2fa.json" />
      <Form.Description
        text={t(
          "File contains plaintext 2FA secrets. Select the same iCloud file on another computer to sync. Existing files are never overwritten.",
          "文件含明文 2FA 密钥；在另一台电脑选择同一 iCloud 文件即可读取。已有文件不会被覆盖。",
        )}
      />
    </Form>
  );
}
