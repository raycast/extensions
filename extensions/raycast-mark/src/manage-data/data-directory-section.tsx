import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  sharedJsonPath,
  disconnectSharedSource,
} from "../shared-json-storage.ts";
import { t } from "../i18n.ts";
import type { LibraryState } from "../model.ts";
import SharedJsonForm from "../shared-json.tsx";
import { DirectoryForm } from "./directory-form.tsx";

export function DataDirectorySection({
  root,
  state,
  onSaved,
  onReload,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
  onReload: () => Promise<void>;
}) {
  const { push } = useNavigation();
  const [source, setSource] = useState("");
  useEffect(() => {
    void sharedJsonPath().then(setSource);
  }, [state]);
  const ready = state.status === "ready";
  const conflicted = state.conflicts.length > 0;
  return (
    <List.Section title={t("数据目录")}>
      <List.Item
        title={source || t("当前未连接")}
        subtitle={t("共享数据文件夹：书签与图片需一起备份")}
        icon={Icon.Link}
        actions={
          <ActionPanel>
            <Action.Push
              title={t("新建文件夹")}
              target={
                <SharedJsonForm
                  root={root}
                  state={state}
                  onSaved={(next) => {
                    onSaved(next);
                    void onReload();
                  }}
                />
              }
            />
            <Action
              title={t("断开并保留本地")}
              icon={Icon.XmarkCircle}
              onAction={async () => {
                await disconnectSharedSource();
                await onReload();
              }}
            />
            <Action title={t("重新加载")} onAction={onReload} />
          </ActionPanel>
        }
      />
      <List.Item
        title={root}
        subtitle={t(
          "专用目录：本地配置项；切换只改变本机配置，不搬迁、不删除旧库",
        )}
        icon={Icon.Folder}
        accessories={[
          {
            text: ready
              ? t("可写入")
              : conflicted
                ? t("只读：存在冲突")
                : t("只读"),
          },
          { text: t`书签 ${state.bookmarks.length}` },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={t("校验自选目录")}
              icon={Icon.Checkmark}
              onAction={() => push(<DirectoryForm />)}
            />
            <Action.Push
              title={t("共享数据文件夹")}
              icon={Icon.Link}
              target={
                <SharedJsonForm
                  root={root}
                  state={state}
                  onSaved={(next) => {
                    onSaved(next);
                    void onReload();
                  }}
                />
              }
            />
            <Action.CopyToClipboard title={t("复制数据目录")} content={root} />
            <Action
              title={t("重新加载")}
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={onReload}
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
