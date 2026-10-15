import { t } from "./i18n.ts";
import path from "node:path";
import { useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { canonical } from "./model.ts";
import type { LibraryState } from "./model.ts";
import { readLibrary } from "./repository.ts";
import { connectSharedJson, previewSharedJson } from "./shared-json-sync.ts";
import {
  disconnectSharedSource,
  localLibrarySnapshot,
  portableLibrary,
  prepareLibrary,
  readSharedSource,
  setSharedJsonSource,
  sharedJsonPath,
  withExternalSharedJson,
} from "./shared-json-storage.ts";

export default function SharedJsonForm({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const [connectedPath, setConnectedPath] = useState("");
  useEffect(() => {
    void sharedJsonPath().then(setConnectedPath);
  }, []);
  async function connect(folder: string) {
    const source = await portableLibrary.readBookmarks(folder);
    const plan = previewSharedJson(
      JSON.stringify(source.document),
      state,
      true,
    );
    const accepted = await confirmAlert({
      title: t("以文件夹为准替换本地库？"),
      message: `${t("预览变更实体")} ${plan.mutations.length} · ${t("书签")} ${plan.counts.bookmarks} · ${t("分类")} ${plan.counts.groups}\n${t("继续后权威覆盖当前书签与分类；请先导出本地备份。原事件历史保留。书签与图片需一起备份。\n")}${folder}`,
      primaryAction: {
        title: t("使用此文件夹"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!accepted) return;
    const result = await connectSharedJson(
      root,
      folder,
      state,
      source.bookmarksText,
    );
    onSaved(result.state);
    pop();
  }
  async function create(values: Form.Values) {
    const parent = (values.directory as string[] | undefined)?.[0];
    const name =
      typeof values.filename === "string" ? values.filename.trim() : "";
    if (
      !parent ||
      !name ||
      name === "." ||
      name === ".." ||
      /[/\\\0]/.test(name)
    )
      throw new Error(t("请选择目录并输入有效的文件夹名称"));
    const target = path.join(parent, name);
    await withExternalSharedJson(async () => {
      const current = await readLibrary(root);
      if (state.status !== "ready")
        throw new Error(t("仅可对已验证且无冲突的库导入或完整导出"));
      if (canonical(current) !== canonical(state))
        throw new Error(t("数据已变化，请重新打开表单或预览"));
      const oldSource = await sharedJsonPath();
      const seed = oldSource
        ? await readSharedSource(oldSource).catch(() => undefined)
        : undefined;
      if (seed) {
        // Validate the connected source before creating another folder from the local library.
        const sourcePlan = previewSharedJson(seed.text, current, true);
        if (
          (await localLibrarySnapshot(root, {
            ...current,
            catalog: sourcePlan.data.catalog,
            bookmarks: sourcePlan.data.bookmarks,
          })) !== (await localLibrarySnapshot(root, current))
        )
          throw new Error(t("源与本地不一致；请先重试同步或导出备份后断开"));
      }
      const prepared = await prepareLibrary(root, current, seed?.raw);
      await portableLibrary.exportFolder(
        target,
        prepared,
        seed ? oldSource : root,
      );
      const created = await portableLibrary.readBookmarks(target);
      if (
        created.bookmarksDigest !== prepared.bookmarksDigest ||
        canonical(current) !== canonical(await readLibrary(root))
      )
        throw new Error(t("数据已变化，请重新打开表单或预览"));
      if (seed && seed.raw !== (await readSharedSource(oldSource)).raw)
        throw new Error(t("数据已变化，请重新打开表单或预览"));
      await setSharedJsonSource(
        target,
        created.bookmarksText,
        await localLibrarySnapshot(root, current),
      );
      onSaved(current);
      pop();
    });
  }
  async function perform(operation: () => Promise<void>) {
    try {
      await operation();
      await showToast({ style: Toast.Style.Success, title: t("数据源已更新") });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("数据源操作失败"),
        message: error instanceof Error ? error.message : t("未知错误"),
      });
    }
  }
  return (
    <Form
      navigationTitle={t("共享数据文件夹")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("打开已有文件夹")}
            icon={Icon.Link}
            onSubmit={(values) =>
              perform(async () => {
                const folder = (values.existing as string[] | undefined)?.[0];
                if (!folder) throw new Error(t("请选择共享数据文件夹"));
                await connect(folder);
              })
            }
          />
          <Action.SubmitForm
            title={t("新建文件夹并使用本地库初始化")}
            icon={Icon.Plus}
            onSubmit={(values) => perform(() => create(values))}
          />
          <Action
            title={t("断开并保留本地")}
            icon={Icon.XmarkCircle}
            onAction={() =>
              perform(async () => {
                await disconnectSharedSource();
                onSaved(await readLibrary(root));
                pop();
              })
            }
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("当前数据源")}
        text={connectedPath || t("当前未连接")}
      />
      <Form.Description
        title={t("打开")}
        text={t(
          "选择包含 bookmarks.json 与 assets/icons 的文件夹；预览后确认权威覆盖。书签与图片需一起备份。",
        )}
      />
      <Form.FilePicker
        id="existing"
        title={t("数据文件夹")}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.Separator />
      <Form.Description
        title={t("新建文件夹")}
        text={t(
          "使用已验证本地库创建新文件夹；目标须不存在或为空。完成验证后切换连接。",
        )}
      />
      <Form.FilePicker
        id="directory"
        title={t("保存目录")}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.TextField
        id="filename"
        title={t("文件夹名称")}
        defaultValue="goose-marks"
      />
    </Form>
  );
}
