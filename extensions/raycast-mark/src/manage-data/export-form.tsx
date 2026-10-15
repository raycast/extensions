import path from "node:path";
import {
  Action,
  ActionPanel,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { t } from "../i18n.ts";
import { failureMessage } from "../bookmark-form.tsx";
import { saveRecoveryBackup } from "../recovery-backup.ts";
import { saveFolderExport } from "../import-export.ts";

export function ExportForm({
  root,
  recovery = false,
}: {
  root: string;
  recovery?: boolean;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={
        recovery ? t("备份本地事件库（恢复用）") : t("导出数据文件夹")
      }
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("导出")}
            icon={Icon.Upload}
            onSubmit={async (values: Form.Values) => {
              const directory = (values.directory as string[] | undefined)?.[0];
              if (!directory) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("请选择导出目录"),
                });
                return;
              }
              const destination = path.join(
                directory,
                `${recovery ? "marks-recovery" : "marks-export"}-${new Date().toISOString().replace(/[:.]/g, "-")}`,
              );
              try {
                if (recovery) await saveRecoveryBackup(root, destination);
                else await saveFolderExport(root, destination);
                await showToast({
                  style: Toast.Style.Success,
                  title: recovery
                    ? t("已备份本地事件库")
                    : t("已导出本地已验证数据"),
                  message: destination,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("未导出"),
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("说明")}
        text={
          recovery
            ? t(
                "复制原始 events/icons 到新目录，仅供恢复；不是通用书签文件夹，不含源设置。失败的目标会保留并标为不完整。",
              )
            : t(
                "导出独立数据文件夹，书签与图片需一起备份；不包含源设置。目标目录必须为空，不覆盖已有内容。",
              )
        }
      />
      <Form.FilePicker
        id="directory"
        title={t("导出目录")}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
