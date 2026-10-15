import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { t } from "../i18n.ts";
import type { LibraryState } from "../model.ts";
import { ImportFileForm } from "./import-file-form.tsx";
import { ExportForm } from "./export-form.tsx";

export function ImportExportSection({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  const { push } = useNavigation();
  return (
    <List.Section title={t("导入导出")}>
      {state.status === "ready" && (
        <List.Item
          title={t("导入数据文件夹")}
          subtitle={t("先预览统计与警告，再逐项决定同 ID 差异；一次事务写入")}
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action
                title={t("导入数据文件夹")}
                icon={Icon.Download}
                onAction={() =>
                  push(
                    <ImportFileForm
                      root={root}
                      state={state}
                      onSaved={onSaved}
                    />,
                  )
                }
              />
            </ActionPanel>
          }
        />
      )}
      <List.Item
        title={t("导出数据文件夹")}
        subtitle={t("另存到你选择的目录；不覆盖现有文件，不写回数据目录")}
        icon={Icon.Upload}
        actions={
          <ActionPanel>
            <Action
              title={t("导出数据文件夹")}
              icon={Icon.Upload}
              onAction={() => push(<ExportForm root={root} />)}
            />
          </ActionPanel>
        }
      />
      <List.Item
        title={t("备份本地事件库（恢复用）")}
        icon={Icon.Folder}
        actions={
          <ActionPanel>
            <Action.Push
              title={t("备份本地事件库（恢复用）")}
              target={<ExportForm root={root} recovery />}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
