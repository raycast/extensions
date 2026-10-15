import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { exportAsSyncJson } from "../../vendor/lib/data-transfer";
import { t } from "../lib/i18n";
import { normalizePath, writeBackupFile } from "../lib/vault-file";
import { getVaultState } from "../lib/vault-store";

export default function ExportForm() {
  const { pop } = useNavigation();
  const [path, setPath] = useState(`~/Downloads/goose-2fa-backup-${new Date().toISOString().slice(0, 10)}.json`);
  return (
    <Form
      navigationTitle={t("Export to File", "导出到文件")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Export", "导出")}
            onSubmit={async () => {
              const target = normalizePath(path);
              if (!target) return;
              const snapshot = getVaultState();
              try {
                writeBackupFile(target, exportAsSyncJson(snapshot.accounts, snapshot.groups, snapshot.trash));
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("Export Failed", "导出失败"),
                  message: error instanceof Error ? error.message : String(error),
                });
                return;
              }
              await showToast({
                style: Toast.Style.Success,
                title: t("Full backup exported", "已导出完整备份"),
                message: target,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title={t("Export Path", "导出路径")} value={path} onChange={setPath} />
      <Form.Description
        text={t(
          "The full data source (including IDs and trash) can be used as a data source on another device.",
          "导出的是完整数据源格式（含 id 与回收站），可直接作为另一台设备的数据源文件。",
        )}
      />
    </Form>
  );
}
