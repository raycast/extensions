import { t } from "./i18n.ts";
import * as fs from "node:fs/promises";
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
import type { LibraryState, Mutation } from "./model.ts";
import {
  bookmarkMutation,
  canonical,
  catalogMutation,
  TRASH_LOCATION,
} from "./model.ts";
import { readLibrary } from "./repository.ts";
import {
  applyJsonImport,
  exportPortableJson,
  previewJsonImport,
} from "./import-export.ts";
import type { ImportPlan } from "./import-export.ts";
import {
  readSharedJson,
  setSharedJsonSource,
  sharedJsonBaseline,
  sharedJsonDigest,
  sharedJsonPath,
  updateSharedJsonBaseline,
  withExternalSharedJson,
} from "./shared-json-storage.ts";

function authoritativePlan(plan: ImportPlan, state: LibraryState): ImportPlan {
  const incomingIds = new Set(
    plan.data.bookmarks.map((bookmark) => bookmark.id),
  );
  const mutations: Mutation[] = plan.mutations.filter(
    (mutation) => mutation.entity !== "catalog",
  );
  const incomingCatalog = {
    id: "catalog" as const,
    groups: plan.data.catalog.groups,
  };
  if (canonical(incomingCatalog) !== canonical(state.catalog))
    mutations.push(catalogMutation(state, incomingCatalog));
  for (const bookmark of state.bookmarks) {
    if (incomingIds.has(bookmark.id)) continue;
    const deleted = {
      ...bookmark,
      isDeleted: true,
      locations: [TRASH_LOCATION],
      prevLocations: undefined,
      updatedAt: Date.now(),
    };
    if (
      !bookmark.isDeleted ||
      canonical(bookmark.locations) !== canonical(deleted.locations)
    )
      mutations.push(bookmarkMutation(state, deleted));
  }
  return { ...plan, mutations };
}

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
  async function connect(file: string) {
    const raw = await readSharedJson(file);
    const plan = previewJsonImport(raw, state);
    const incomingIds = new Set(
      plan.data.bookmarks.map((bookmark) => bookmark.id),
    );
    const missingLocally = state.bookmarks.filter(
      (bookmark) => !incomingIds.has(bookmark.id),
    ).length;
    const differenceCount = plan.differences.length + missingLocally;
    const accepted = await confirmAlert({
      title: differenceCount
        ? t`本地库与文件不一致（${differenceCount} 项）`
        : t("确认连接共享文件？"),
      message: t`已验证 JSON：${plan.counts.bookmarks} 条书签、${plan.counts.groups} 个分组。${differenceCount ? t("继续后以文件为准更新当前本地库；若要保留本地内容，请取消并先从“设置与数据”导出备份。") : t("文件与当前库一致。")}\n\n原事件目录不会删除。\n${file}`,
      primaryAction: {
        title: t("使用此文件"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!accepted) return;
    const chosen = authoritativePlan(plan, state);
    const decisions = Object.fromEntries(
      plan.differences.map((difference) => [
        difference.entityKey,
        "incoming" as const,
      ]),
    );
    const result = await withExternalSharedJson(async () => {
      if (
        raw !== (await readSharedJson(file)) ||
        canonical(state) !== canonical(await readLibrary(root))
      )
        throw new Error(t("数据已变化，请重新打开表单或预览"));
      const imported = chosen.mutations.length
        ? await applyJsonImport(root, chosen, decisions)
        : { state };
      const local = await exportPortableJson(root, imported.state);
      await setSharedJsonSource(file, raw, local);
      return imported;
    });
    onSaved(result.state);
    await showToast({
      style: Toast.Style.Success,
      title: t("已连接共享 JSON"),
    });
    pop();
  }

  async function create(values: Form.Values) {
    const directory = (values.directory as string[] | undefined)?.[0];
    const name =
      typeof values.filename === "string" ? values.filename.trim() : "";
    if (
      !directory ||
      !/^[^/\\]+\.json$/i.test(name) ||
      name === "." ||
      name === ".." ||
      name.includes("\0")
    )
      throw new Error(t("请选择目录并输入有效的 .json 文件名"));
    return withExternalSharedJson(async () => {
      const target = path.join(directory, name);
      const raw = await exportPortableJson(root, await readLibrary(root));
      let handle: Awaited<ReturnType<typeof fs.open>> | undefined;
      let created = false;
      let owned: { dev: number; ino: number } | undefined;
      try {
        handle = await fs.open(target, "wx", 0o600);
        created = true;
        owned = await handle.stat();
        await handle.writeFile(raw, "utf8");
        await handle.sync();
      } catch (error) {
        await handle?.close().catch(() => undefined);
        handle = undefined;
        let cleanupFailed = false;
        if (created && owned) {
          const current = await fs.lstat(target).catch(() => undefined);
          if (
            current?.isFile() &&
            !current.isSymbolicLink() &&
            current.dev === owned.dev &&
            current.ino === owned.ino
          ) {
            try {
              await fs.unlink(target);
            } catch {
              cleanupFailed = true;
            }
          }
        }
        if (cleanupFailed)
          throw new Error(t`新文件写入失败且清理失败，请手工检查：${target}`);
        throw error;
      } finally {
        await handle?.close().catch(() => undefined);
      }
      await setSharedJsonSource(target, raw, raw);
      await showToast({
        style: Toast.Style.Success,
        title: t("已创建共享 JSON"),
      });
      pop();
    });
  }

  return (
    <Form
      navigationTitle={t("共享 JSON 数据源")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("使用已有 JSON 文件")}
            icon={Icon.Link}
            onSubmit={async (values) => {
              const file = (values.existing as string[] | undefined)?.[0];
              if (!file) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("请选择 JSON 文件"),
                });
                return;
              }
              try {
                await connect(file);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("连接失败，文件未覆盖"),
                  message:
                    error instanceof Error ? error.message : t("文件无效"),
                });
              }
            }}
          />
          <Action.SubmitForm
            title={t("新建 JSON 并初始化本地库")}
            icon={Icon.Plus}
            onSubmit={async (values) => {
              try {
                await create(values);
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("创建失败，未覆盖文件"),
                  message:
                    error instanceof Error ? error.message : t("文件无效"),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("已有 JSON")}
        text={t`有效文件作为权威数据源；确认后才会应用到当前本地库。损坏、缺失或冲突时阻断写入。${connectedPath ? t` 当前连接：${connectedPath}` : t(" 当前未连接。")}`}
      />
      <Form.FilePicker
        id="existing"
        title={t("选择 JSON 文件")}
        canChooseDirectories={false}
        canChooseFiles
        allowMultipleSelection={false}
      />
      <Form.Separator />
      <Form.Description
        title={t("新建 JSON")}
        text={t(
          "仅在目标文件不存在时创建；使用当前本地库初始化，图标随 JSON 内嵌保存。可选择 iCloud Drive 目录。",
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
        title={t("文件名")}
        defaultValue="goose-marks.json"
      />
    </Form>
  );
}

export async function refreshSharedJson(root: string, state: LibraryState) {
  return withExternalSharedJson(async () => {
    const file = await sharedJsonPath();
    if (!file) return state;
    const current = await readLibrary(root);
    const raw = await readSharedJson(file);
    const baseline = await sharedJsonBaseline();
    if (!baseline.remote || !baseline.local)
      throw new Error(t("共享 JSON 基线缺失；为避免覆盖，请重新连接文件"));
    const local = await exportPortableJson(root, current);
    if (sharedJsonDigest(raw) === baseline.remote) {
      if (sharedJsonDigest(local) !== baseline.local)
        throw new Error(
          t("本地库有尚未写入共享 JSON 的变更；请先导出备份，再重新连接文件"),
        );
      return canonical(current) === canonical(state) ? state : current;
    }
    if (sharedJsonDigest(local) !== baseline.local)
      throw new Error(
        t("共享文件与本地库均有变化；检测到冲突，已阻断同步和写入"),
      );
    const plan = previewJsonImport(raw, current);
    const chosen = authoritativePlan(plan, current);
    const decisions = Object.fromEntries(
      plan.differences.map((difference) => [
        difference.entityKey,
        "incoming" as const,
      ]),
    );
    const result = chosen.mutations.length
      ? await applyJsonImport(root, chosen, decisions)
      : { state: current };
    const nextLocal = await exportPortableJson(root, result.state);
    await updateSharedJsonBaseline(raw, nextLocal);
    return result.state;
  });
}
