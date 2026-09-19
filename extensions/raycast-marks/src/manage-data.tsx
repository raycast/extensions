import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import path from "node:path";
import { Fragment, useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { aiConfigFromPreferences } from "./ai.ts";
import { failureMessage } from "./bookmark-form.tsx";
import {
  applyJsonImport,
  previewJsonImport,
  saveJsonExport,
} from "./import-export.ts";
import type { ImportDecisions, ImportPlan } from "./import-export.ts";
import {
  catalogMutation,
  DEFAULT_LOCATION,
  entityKey,
  MAX_EVENT_BYTES,
  removeCategory,
  TRASH_LOCATION,
  validateBookmark,
} from "./model.ts";
import type {
  Bookmark,
  Candidate,
  Catalog,
  Conflict,
  EntityValue,
  LibraryState,
  Location,
  Mutation,
} from "./model.ts";
import {
  commit,
  configureDirectory,
  readLibrary,
  resolveConflicts,
} from "./repository.ts";

function isCatalog(value: EntityValue): value is Catalog {
  return (value as Catalog).groups !== undefined;
}

function locationLabel(catalog: Catalog, location: Location): string {
  const group = catalog.groups.find((g) => g.id === location.groupId);
  const sub = group?.children.find((s) => s.id === location.subGroupId);
  return `${group?.name ?? location.groupId} › ${sub?.name ?? location.subGroupId}`;
}

function memberCount(
  state: LibraryState,
  groupId: string,
  subGroupId?: string,
) {
  return state.bookmarks.filter((bookmark) =>
    bookmark.locations.some(
      (location) =>
        location.groupId === groupId &&
        (!subGroupId || location.subGroupId === subGroupId),
    ),
  ).length;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [root, setRoot] = useState<string>();
  const [state, setState] = useState<LibraryState>();
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [resolutions, setResolutions] = useState<
    Record<string, { eventId: string; mutation: Mutation }>
  >({});

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const directory = await configureDirectory(
        preferences.dataDirectory,
        environment.supportPath,
      );
      const library = await readLibrary(directory);
      setRoot(directory);
      setState(library);
      setResolutions({});
      setFailure(undefined);
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsLoading(false);
  }, [preferences.dataDirectory]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteCategory(
    groupId: string,
    subGroupId: string | undefined,
    target: "default" | "trash",
  ) {
    if (!root || !state) return;
    let mutations: Mutation[];
    let affectedCount: number;
    try {
      ({ mutations, affectedCount } = removeCategory(
        state,
        groupId,
        subGroupId,
        target,
      ));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "无法删除分类",
        message: failureMessage(error),
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: `删除${subGroupId ? "子分类" : "一级分类"}？`,
      message: `受影响的 ${affectedCount} 个书签将${target === "trash" ? "移入回收站" : "移至默认位置"}；分类与书签在同一事务写入。`,
      primaryAction: { title: "删除", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const result = await commit(root, {
        mutations,
        expectedHeads: state.heads,
      });
      setState(result.state);
      await showToast({
        style: Toast.Style.Success,
        title: "已删除分类",
        message: result.warning ?? `受影响书签 ${affectedCount} 个`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未写入",
        message: failureMessage(error),
      });
    }
  }

  async function applyResolutions() {
    if (!root || !state) return;
    const chosen = Object.values(resolutions);
    if (chosen.length !== state.conflicts.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: "还有冲突未选择版本",
        message: `已选择 ${chosen.length}/${state.conflicts.length}`,
      });
      return;
    }
    try {
      const result = await resolveConflicts(
        root,
        chosen.map((entry) => entry.mutation),
        state.heads,
      );
      setState(result.state);
      setResolutions({});
      await showToast({
        style: Toast.Style.Success,
        title: "冲突已解决",
        message: result.warning ?? `已提交 ${chosen.length} 个版本`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未写入",
        message: failureMessage(error),
      });
    }
  }

  const recoveryActions = (
    <ActionPanel>
      <Action
        title="重新加载"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={load}
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
        markdown={`# 无法读取本地库\n\n${failure}\n\n请确认数据目录存在且为专用目录（空或仅含 \`events\`）。切换目录只改变本机配置，不搬迁、不删除旧库。`}
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
        markdown={`# 本地库已暂停写入\n\n存在损坏、缺父、未知版本或超限的数据；不会以空库覆盖，也不会自动清理未知文件。\n\n${issues}\n\n数据目录：\`${root}\``}
        actions={recoveryActions}
      />
    );
  }

  const ready = state.status === "ready";
  const conflicted = state.conflicts.length > 0;
  const ai = aiConfigFromPreferences(preferences);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Marks 数据管理"
      searchBarPlaceholder="搜索分类或功能"
    >
      <List.Section title="数据目录">
        <List.Item
          title={root}
          subtitle="专用目录：本地配置项；切换只改变本机配置，不搬迁、不删除旧库"
          icon={Icon.Folder}
          accessories={[
            {
              text: ready ? "可写入" : conflicted ? "只读：存在冲突" : "只读",
            },
            { text: `书签 ${state.bookmarks.length}` },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="打开扩展设置（修改数据目录）"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
              <Action
                title="校验自选目录"
                icon={Icon.Checkmark}
                onAction={() => push(<DirectoryForm />)}
              />
              <Action.CopyToClipboard title="复制数据目录" content={root} />
              <Action
                title="重新加载"
                icon={Icon.ArrowClockwise}
                shortcut={Keyboard.Shortcut.Common.Refresh}
                onAction={load}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {conflicted && (
        <List.Section
          title={`未解决冲突（${state.conflicts.length}）`}
          subtitle="普通写入已暂停，仅允许解决冲突"
        >
          {state.conflicts.map((conflict) => {
            const chosen = resolutions[conflict.entityKey];
            return (
              <List.Item
                key={conflict.entityKey}
                title={conflictTitle(conflict)}
                subtitle={conflict.message}
                icon={Icon.Warning}
                accessories={[
                  { tag: `${conflict.candidates.length} 个版本` },
                  {
                    text: chosen
                      ? `已选择 ${chosen.eventId.slice(0, 8)}`
                      : "未选择",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="查看版本并选择"
                      icon={Icon.List}
                      onAction={() =>
                        push(
                          <ConflictView
                            state={state}
                            conflict={conflict}
                            onChoose={(choice) =>
                              setResolutions((previous) => ({
                                ...previous,
                                [conflict.entityKey]: choice,
                              }))
                            }
                          />,
                        )
                      }
                    />
                  </ActionPanel>
                }
              />
            );
          })}
          <List.Item
            title="应用全部冲突解决"
            subtitle={`已选择 ${Object.keys(resolutions).length}/${state.conflicts.length}；必须一次解决全部冲突`}
            icon={Icon.Checkmark}
            actions={
              <ActionPanel>
                <Action
                  title="应用全部冲突解决"
                  icon={Icon.Checkmark}
                  onAction={applyResolutions}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {ready && (
        <List.Section title="分类">
          <List.Item
            title="新建一级分类"
            icon={Icon.Plus}
            actions={
              <ActionPanel>
                <Action
                  title="新建一级分类"
                  icon={Icon.Plus}
                  onAction={() =>
                    push(
                      <CategoryForm
                        root={root}
                        state={state}
                        mode="create-group"
                        onSaved={setState}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
          {state.catalog.groups.map((group) => {
            const fixed =
              group.id === DEFAULT_LOCATION.groupId ||
              group.id === TRASH_LOCATION.groupId;
            return (
              <Fragment key={group.id}>
                <List.Item
                  title={group.name}
                  subtitle={`一级分类 · 书签 ${memberCount(state, group.id)}`}
                  icon={Icon.Folder}
                  actions={
                    <ActionPanel>
                      <Action
                        title="新建子分类"
                        icon={Icon.Plus}
                        onAction={() =>
                          push(
                            <CategoryForm
                              root={root}
                              state={state}
                              mode="create-sub"
                              groupId={group.id}
                              onSaved={setState}
                            />,
                          )
                        }
                      />
                      <Action
                        title="重命名"
                        icon={Icon.Pencil}
                        shortcut={Keyboard.Shortcut.Common.Edit}
                        onAction={() =>
                          push(
                            <CategoryForm
                              root={root}
                              state={state}
                              mode="rename-group"
                              groupId={group.id}
                              onSaved={setState}
                            />,
                          )
                        }
                      />
                      {!fixed && (
                        <>
                          <Action
                            title="删除（书签移至默认位置）"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            onAction={() =>
                              void deleteCategory(
                                group.id,
                                undefined,
                                "default",
                              )
                            }
                          />
                          <Action
                            title="删除（书签移入回收站）"
                            icon={Icon.Trash}
                            style={Action.Style.Destructive}
                            shortcut={Keyboard.Shortcut.Common.Remove}
                            onAction={() =>
                              void deleteCategory(group.id, undefined, "trash")
                            }
                          />
                        </>
                      )}
                    </ActionPanel>
                  }
                />
                {group.children.map((sub) => (
                  <List.Item
                    key={sub.id}
                    title={`↳ ${sub.name}`}
                    subtitle={`子分类 · 书签 ${memberCount(state, group.id, sub.id)}`}
                    accessories={[{ tag: group.name }]}
                    actions={
                      <ActionPanel>
                        <Action
                          title="重命名"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          onAction={() =>
                            push(
                              <CategoryForm
                                root={root}
                                state={state}
                                mode="rename-sub"
                                groupId={group.id}
                                subGroupId={sub.id}
                                onSaved={setState}
                              />,
                            )
                          }
                        />
                        {!fixed && (
                          <>
                            <Action
                              title="删除（书签移至默认位置）"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              onAction={() =>
                                void deleteCategory(group.id, sub.id, "default")
                              }
                            />
                            <Action
                              title="删除（书签移入回收站）"
                              icon={Icon.Trash}
                              style={Action.Style.Destructive}
                              shortcut={Keyboard.Shortcut.Common.Remove}
                              onAction={() =>
                                void deleteCategory(group.id, sub.id, "trash")
                              }
                            />
                          </>
                        )}
                      </ActionPanel>
                    }
                  />
                ))}
              </Fragment>
            );
          })}
        </List.Section>
      )}

      {ready && (
        <List.Section title="导入导出">
          <List.Item
            title="导入 JSON"
            subtitle="先预览统计与警告，再逐项决定同 ID 差异；一次事务写入"
            icon={Icon.Download}
            actions={
              <ActionPanel>
                <Action
                  title="导入 JSON"
                  icon={Icon.Download}
                  onAction={() =>
                    push(
                      <ImportFileForm
                        root={root}
                        state={state}
                        onSaved={setState}
                      />,
                    )
                  }
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="导出 JSON"
            subtitle="另存到你选择的目录；不覆盖现有文件，不写回数据目录"
            icon={Icon.Upload}
            actions={
              <ActionPanel>
                <Action
                  title="导出 JSON"
                  icon={Icon.Upload}
                  onAction={() => push(<ExportForm root={root} />)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="AI（可选 BYOK）">
        <List.Item
          title={`协议：${ai.protocol}`}
          subtitle={`服务：${ai.baseUrl || "未配置"} · 模型：${ai.model || "未配置"}`}
          icon={Icon.Stars}
          accessories={[
            { text: ai.apiKey ? "已配置该协议 Key" : "缺少该协议 Key" },
            { text: "仅在你主动发送时请求" },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="打开扩展设置"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function conflictTitle(conflict: Conflict): string {
  const value = conflict.candidates[0]?.value;
  if (value && !isCatalog(value)) return value.title || `书签 ${value.id}`;
  return "分类表（Catalog）";
}

type CategoryMode =
  "create-group" | "create-sub" | "rename-group" | "rename-sub";

function CategoryForm({
  root,
  state,
  mode,
  groupId,
  subGroupId,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  mode: CategoryMode;
  groupId?: string;
  subGroupId?: string;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const group = state.catalog.groups.find((g) => g.id === groupId);
  const sub = group?.children.find((s) => s.id === subGroupId);
  const [name, setName] = useState(
    mode.startsWith("rename") ? (sub?.name ?? group?.name ?? "") : "",
  );

  async function save() {
    const nextName = name.trim();
    if (!nextName) {
      await showToast({ style: Toast.Style.Failure, title: "请填写分类名称" });
      return;
    }
    const catalog = structuredClone(state.catalog);
    const now = Date.now();
    if (mode === "create-group") {
      // Matches the legacy shape: a group always carries its own default sub-group.
      catalog.groups.push({
        id: randomUUID(),
        name: nextName,
        createdAt: now,
        updatedAt: now,
        children: [
          { id: randomUUID(), name: "未分类", createdAt: now, updatedAt: now },
        ],
      });
    } else {
      const target = catalog.groups.find((g) => g.id === groupId);
      if (!target) {
        await showToast({ style: Toast.Style.Failure, title: "分类不存在" });
        return;
      }
      if (mode === "create-sub") {
        target.children.push({
          id: randomUUID(),
          name: nextName,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        const child =
          mode === "rename-sub"
            ? target.children.find((s) => s.id === subGroupId)
            : target;
        if (!child) {
          await showToast({ style: Toast.Style.Failure, title: "分类不存在" });
          return;
        }
        child.name = nextName;
        child.updatedAt = now;
      }
    }
    try {
      const result = await commit(root, {
        mutations: [catalogMutation(state, catalog)],
        expectedHeads: state.heads,
      });
      onSaved(result.state);
      await showToast({
        style: Toast.Style.Success,
        title: "已保存分类",
        message: result.warning ?? nextName,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未写入",
        message: failureMessage(error),
      });
    }
  }

  const titles: Record<CategoryMode, string> = {
    "create-group": "新建一级分类",
    "create-sub": `在 ${group?.name ?? ""} 中新建子分类`,
    "rename-group": "重命名一级分类",
    "rename-sub": "重命名子分类",
  };

  return (
    <Form
      navigationTitle={titles[mode]}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="保存"
            icon={Icon.Checkmark}
            onSubmit={save}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="名称"
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.Description
        title="说明"
        text="分类改动与书签移动在同一事务写入；默认分类与回收站不可删除。"
      />
    </Form>
  );
}

function ConflictView({
  state,
  conflict,
  onChoose,
}: {
  state: LibraryState;
  conflict: Conflict;
  onChoose: (choice: { eventId: string; mutation: Mutation }) => void;
}) {
  const { pop } = useNavigation();
  const heads = [...(state.heads[conflict.entityKey] ?? [])].sort();

  function choose(candidate: Candidate, mode: "keep" | "trash" | "default") {
    if (isCatalog(candidate.value)) {
      onChoose({
        eventId: candidate.eventId,
        mutation: {
          entity: "catalog",
          entityId: candidate.value.id,
          baseHeads: heads,
          value: candidate.value,
        },
      });
      pop();
      return;
    }
    const bookmark = candidate.value;
    const value =
      mode === "keep"
        ? bookmark
        : validateBookmark({
            ...bookmark,
            isDeleted: mode === "trash",
            prevLocations:
              mode === "trash" ? bookmark.locations : bookmark.prevLocations,
            locations: mode === "trash" ? [TRASH_LOCATION] : [DEFAULT_LOCATION],
            updatedAt: Date.now(),
          });
    onChoose({
      eventId: candidate.eventId,
      mutation: {
        entity: "bookmark",
        entityId: bookmark.id,
        baseHeads: heads,
        value,
      },
    });
    pop();
  }

  return (
    <List navigationTitle="选择要保留的版本">
      <List.Section
        title={`${conflict.candidates.length} 个并发版本`}
        subtitle="选择后返回上一页；全部冲突选择完才能应用"
      >
        {conflict.candidates.map((candidate) => {
          const value = candidate.value;
          const catalog = isCatalog(value);
          const bookmark = catalog ? undefined : (value as Bookmark);
          return (
            <List.Item
              key={candidate.eventId}
              title={
                catalog
                  ? `分类表：${value.groups.length} 个一级分类`
                  : bookmark!.title || `书签 ${bookmark!.id}`
              }
              subtitle={
                catalog
                  ? value.groups.map((g) => g.name).join("、")
                  : [
                      bookmark!.url,
                      bookmark!.desc ?? "",
                      `位置：${bookmark!.locations.map((l) => locationLabel(state.catalog, l)).join("，")}`,
                    ]
                      .filter(Boolean)
                      .join("\n")
              }
              icon={
                bookmark?.isDeleted
                  ? Icon.Trash
                  : catalog
                    ? Icon.Folder
                    : Icon.Bookmark
              }
              accessories={[
                { tag: `版本 ${candidate.eventId.slice(0, 8)}` },
                ...(bookmark?.isDeleted ? [{ tag: "墓碑（已删除）" }] : []),
                ...(bookmark?.visits !== undefined
                  ? [{ text: `基数 ${bookmark.visits} 次` }]
                  : []),
                ...(bookmark
                  ? [{ date: new Date(bookmark.updatedAt ?? 0) }]
                  : []),
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="选择并保留此版本"
                    icon={Icon.Checkmark}
                    onAction={() => choose(candidate, "keep")}
                  />
                  {bookmark && (
                    <>
                      <Action
                        title="选择并移入回收站"
                        icon={Icon.Trash}
                        onAction={() => choose(candidate, "trash")}
                      />
                      <Action
                        title="选择并修复到默认位置"
                        icon={Icon.ArrowCounterClockwise}
                        onAction={() => choose(candidate, "default")}
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function ImportFileForm({
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
    <Form
      navigationTitle="导入 JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="预览导入"
            icon={Icon.Download}
            onSubmit={async (values: Form.Values) => {
              const picked = (values.file as string[] | undefined)?.[0];
              if (!picked) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "请选择 JSON 文件",
                });
                return;
              }
              try {
                const stat = await fs.lstat(picked);
                if (!stat.isFile() || stat.isSymbolicLink())
                  throw new Error("请选择普通文件");
                if (stat.size > MAX_EVENT_BYTES)
                  throw new Error("文件超过 10 MiB 上限");
                const plan = previewJsonImport(
                  await fs.readFile(picked, "utf8"),
                  state,
                );
                push(
                  <ImportPreview root={root} plan={plan} onSaved={onSaved} />,
                );
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "预览失败",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="接受的格式"
        text="本插件导出的 JSON，或旧 goose-mark 的 {groups, bookmarks} 格式。设置、API Key 等字段会被拒绝；导入不会读取附件文件。"
      />
      <Form.FilePicker
        id="file"
        title="JSON 文件"
        canChooseDirectories={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}

function ImportPreview({
  root,
  plan,
  onSaved,
}: {
  root: string;
  plan: ImportPlan;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const [decisions, setDecisions] = useState<ImportDecisions>({});
  const remaining = plan.differences.filter(
    (difference) => !decisions[difference.entityKey],
  ).length;
  const effective = plan.mutations.filter(
    (mutation) =>
      decisions[entityKey(mutation.entity, mutation.entityId)] !== "local",
  );

  async function apply() {
    if (remaining) {
      await showToast({
        style: Toast.Style.Failure,
        title: `还有 ${remaining} 个同 ID 差异未选择`,
      });
      return;
    }
    if (!effective.length) {
      await showToast({
        style: Toast.Style.Success,
        title: "无变化",
        message: "导入内容与本地一致，未写入事件",
      });
      pop();
      return;
    }
    try {
      const result = await applyJsonImport(root, plan, decisions);
      onSaved(result.state);
      await showToast({
        style: Toast.Style.Success,
        title: "导入已写入本地",
        message: result.warning ?? `提交 ${effective.length} 个实体`,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "未写入",
        message: failureMessage(error),
      });
    }
  }

  return (
    <List navigationTitle="导入预览">
      <List.Section title="统计">
        <List.Item
          title={`书签 ${plan.counts.bookmarks} · 一级分类 ${plan.counts.groups}`}
          subtitle={`生成 ID ${plan.counts.generatedIds} · 缺失时间 ${plan.counts.missingTimes} · 与本地完全相同 ${plan.counts.identical}`}
        />
        <List.Item
          title={`附件/图标字段 ${plan.counts.attachments}`}
          subtitle="仅被动保留字段值；不读取、不复制、不下载附件"
          icon={plan.counts.attachments ? Icon.Warning : Icon.Document}
        />
        <List.Item
          title={`不同 ID 同 URL ${plan.counts.sameUrl}`}
          subtitle="只提示，不会自动合并或删除多归属"
          icon={plan.counts.sameUrl ? Icon.Info : Icon.Document}
        />
      </List.Section>
      {plan.warnings.length > 0 && (
        <List.Section title="警告">
          {plan.warnings.map((warning) => (
            <List.Item key={warning} title={warning} icon={Icon.Warning} />
          ))}
        </List.Section>
      )}
      {plan.differences.length > 0 && (
        <List.Section
          title={`同 ID 差异（${plan.differences.length}）`}
          subtitle="必须逐项选择，不能静默覆盖"
        >
          {plan.differences.map((difference) => (
            <List.Item
              key={difference.entityKey}
              title={difference.entityKey}
              subtitle={
                isCatalog(difference.local)
                  ? `本地 ${(difference.local as Catalog).groups.length} 个一级分类 → 导入后 ${(difference.incoming as Catalog).groups.length} 个`
                  : `本地「${(difference.local as Bookmark).title}」/ 导入「${(difference.incoming as Bookmark).title}」`
              }
              accessories={[
                { tag: decisions[difference.entityKey] ?? "未选择" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="查看完整差异并选择"
                    icon={Icon.Document}
                    target={
                      <ImportDifference
                        difference={difference}
                        onChoose={(choice) =>
                          setDecisions((previous) => ({
                            ...previous,
                            [difference.entityKey]: choice,
                          }))
                        }
                      />
                    }
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="应用">
        <List.Item
          title="应用导入"
          subtitle={`待提交实体 ${effective.length} · 未选择差异 ${remaining}`}
          icon={Icon.Checkmark}
          actions={
            <ActionPanel>
              <Action title="应用导入" icon={Icon.Checkmark} onAction={apply} />
              <Action title="取消" icon={Icon.XmarkCircle} onAction={pop} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function ImportDifference({
  difference,
  onChoose,
}: {
  difference: ImportPlan["differences"][number];
  onChoose: (choice: "local" | "incoming") => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`导入差异：${difference.entityKey}`}
      actions={
        <ActionPanel>
          <Action
            title="保留本地版本"
            onAction={() => {
              onChoose("local");
              pop();
            }}
          />
          <Action
            title="采用导入版本"
            onAction={() => {
              onChoose("incoming");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="说明"
        text="逐字段比较本地与导入值（含网址、删除状态、位置、描述、标签与完整分类结构）。选择后还需回到预览应用；现有访问统计不被导入值覆盖。"
      />
      {[
        ...new Set([
          ...Object.keys(difference.local),
          ...Object.keys(difference.incoming),
        ]),
      ].map((field) => {
        const local =
          JSON.stringify(Reflect.get(difference.local, field), null, 2) ??
          "（无此字段）";
        const incoming =
          JSON.stringify(Reflect.get(difference.incoming, field), null, 2) ??
          "（无此字段）";
        return (
          <Fragment key={field}>
            <Form.Separator />
            <Form.Description
              title={`${field}${local === incoming ? "（相同）" : "（有差异）"}`}
              text={`本地：\n${local}\n\n导入：\n${incoming}`}
            />
          </Fragment>
        );
      })}
    </Form>
  );
}

function ExportForm({ root }: { root: string }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="导出 JSON"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="导出"
            icon={Icon.Upload}
            onSubmit={async (values: Form.Values) => {
              const directory = (values.directory as string[] | undefined)?.[0];
              if (!directory) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "请选择导出目录",
                });
                return;
              }
              const destination = path.join(
                directory,
                `marks-export-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
              );
              try {
                await saveJsonExport(root, destination);
                await showToast({
                  style: Toast.Style.Success,
                  title: "已导出本地已验证数据",
                  message: destination,
                });
                pop();
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "未导出",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="说明"
        text="只导出已验证且无冲突的数据；不包含 API 配置、数据目录路径或运行时设置。目标文件已存在时会拒绝写入，不覆盖。"
      />
      <Form.FilePicker
        id="directory"
        title="导出目录"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}

function DirectoryForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle="校验自选数据目录"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="校验"
            icon={Icon.Checkmark}
            onSubmit={async (values: Form.Values) => {
              const picked = (values.directory as string[] | undefined)?.[0];
              if (!picked) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "请选择一个已存在的目录",
                });
                return;
              }
              try {
                const real = await fs.realpath(picked);
                if (!(await fs.lstat(real)).isDirectory())
                  throw new Error("请选择目录而不是文件");
                const entries = await fs.readdir(real);
                if (
                  entries.some(
                    (entry) => entry !== "events" && entry !== ".DS_Store",
                  )
                )
                  throw new Error(
                    `目录必须为空或仅含 events，当前包含：${entries.slice(0, 5).join("、")}`,
                  );
                push(
                  <Detail
                    markdown={`# 目录可用\n\n\`${real}\`\n\n把这个路径填入扩展设置中的“Dedicated Data Directory”，然后重新加载命令：\n\n1. 命令 → 扩展设置（本命令的“打开扩展设置”操作）\n2. 粘贴上面的路径并保存\n3. 回到本命令重新加载\n\n切换只改变本机配置，不搬迁、不删除旧库；iCloud Drive 目录可用，但同步延迟、占位文件和并发写入不在本插件保证范围内。`}
                    actions={
                      <ActionPanel>
                        <Action.CopyToClipboard
                          title="复制路径"
                          content={real}
                        />
                        <Action
                          title="打开扩展设置"
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
                  title: "目录不可用",
                  message: failureMessage(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="只做校验"
        text="这里只读取所选目录做检查，不创建、不搬迁、不删除数据，也不会替你写入扩展设置（Raycast 未提供写 preference 的 API）。"
      />
      <Form.FilePicker
        id="directory"
        title="目录"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
    </Form>
  );
}
