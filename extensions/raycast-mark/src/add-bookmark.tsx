import { useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  LaunchType,
  List,
  environment,
  getPreferenceValues,
  launchCommand,
  openExtensionPreferences,
} from "@raycast/api";
import { BookmarkForm, failureMessage } from "./bookmark-form.tsx";
import type { LibraryState } from "./model.ts";
import { configureDirectory, readLibrary } from "./repository.ts";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [root, setRoot] = useState<string>();
  const [state, setState] = useState<LibraryState>();
  const [failure, setFailure] = useState<string>();
  const [formKey, setFormKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const directory = await configureDirectory(
        preferences.dataDirectory,
        environment.supportPath,
      );
      setRoot(directory);
      setState(await readLibrary(directory));
      setFailure(undefined);
    } catch (error) {
      setFailure(failureMessage(error));
    }
  }, [preferences.dataDirectory]);

  useEffect(() => {
    void load();
  }, [load]);

  const recoveryActions = (
    <ActionPanel>
      <Action title="重新加载" icon={Icon.ArrowClockwise} onAction={load} />
      <Action
        title="解决冲突（Manage Marks Data）"
        icon={Icon.Warning}
        onAction={() =>
          void launchCommand({
            name: "manage-data",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <Action
        title="打开扩展设置"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  if (failure) {
    return (
      <Detail
        markdown={`# 无法读取本地库\n\n${failure}\n\n请确认数据目录存在且为专用目录（空或仅含 \`events\`）。切换目录不会搬迁或删除旧库。`}
        actions={recoveryActions}
      />
    );
  }

  if (!root || !state) {
    return (
      <List isLoading>
        <List.EmptyView title="正在读取本地库" />
      </List>
    );
  }

  if (state.status === "blocked") {
    const issues = state.issues
      .map(
        (issue) =>
          `- \`${issue.code}\` ${issue.message}${issue.file ? `（${issue.file}）` : ""}`,
      )
      .join("\n");
    return (
      <Detail
        markdown={`# 本地库已暂停写入\n\n${issues}\n\n数据目录：\`${root}\``}
        actions={recoveryActions}
      />
    );
  }

  if (state.status === "conflicted") {
    return (
      <Detail
        markdown={`# 存在未解决冲突\n\n新增与编辑已暂停，避免产生新的无效分类引用。请先在 Manage Marks Data 中查看版本并解决冲突，再回到本命令。`}
        actions={recoveryActions}
      />
    );
  }

  return (
    <BookmarkForm
      key={formKey}
      root={root}
      state={state}
      onSaved={(next) => {
        setState(next);
        // Remounts the form so the next bookmark starts blank (heads stay fresh).
        setFormKey((previous) => previous + 1);
      }}
    />
  );
}
