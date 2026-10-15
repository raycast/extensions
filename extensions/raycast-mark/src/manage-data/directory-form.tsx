import * as fs from "node:fs/promises";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { t } from "../i18n.ts";
import { failureMessage } from "../bookmark-form.tsx";

export function DirectoryForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle={t("校验自选数据目录")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("校验")}
            icon={Icon.Checkmark}
            onSubmit={async (values: Form.Values) => {
              const picked = (values.directory as string[] | undefined)?.[0];
              if (!picked) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("请选择一个已存在的目录"),
                });
                return;
              }
              try {
                const real = await fs.realpath(picked);
                if (!(await fs.lstat(real)).isDirectory())
                  throw new Error(t("请选择目录而不是文件"));
                const entries = await fs.readdir(real);
                const allowed = new Set(["events", "icons", ".DS_Store"]);
                if (entries.some((entry) => !allowed.has(entry)))
                  throw new Error(
                    t`目录必须为空或仅含 events/icons，当前包含：${entries.slice(0, 5).join(t("、"))}`,
                  );
                push(
                  <Detail
                    markdown={t`# 目录可用\n\n\`${real}\`\n\n把这个路径填入扩展设置中的“Dedicated Data Directory”，然后重新加载命令：\n\n1. 命令 → 扩展设置（本命令的“打开扩展设置”操作）\n2. 粘贴上面的路径并保存\n3. 回到本命令重新加载\n\n切换只改变本机配置，不搬迁、不删除旧库；iCloud Drive 目录可用，但同步延迟、占位文件和并发写入不在本插件保证范围内。`}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title={t("复制路径")}
                          content={real}
                        />
                        <Action
                          title={t("打开扩展设置")}
                          icon={Icon.Gear}
                          onAction={openExtensionPreferences}
                        />
                      </ActionPanel>
                    }
                  />,
                );
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("目录不可用"),
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("只做校验")}
        text={t(
          "这里只读取所选目录做检查，不创建、不搬迁、不删除数据，也不会替你写入扩展设置（Raycast 未提供写 preference 的 API）。",
        )}
      />
      <Form.FilePicker
        id="directory"
        title={t("目录")}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
