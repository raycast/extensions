import { randomUUID } from "node:crypto";
import { useState } from "react";
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
import { catalogMutation } from "../model.ts";
import type { LibraryState } from "../model.ts";
import { commit } from "../repository.ts";

type CategoryMode =
  "create-group" | "create-sub" | "rename-group" | "rename-sub";

export function CategoryForm({
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
      await showToast({
        style: Toast.Style.Failure,
        title: t("请填写分类名称"),
      });
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
        await showToast({ style: Toast.Style.Failure, title: t("分类不存在") });
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
          await showToast({
            style: Toast.Style.Failure,
            title: t("分类不存在"),
          });
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
        title: t("已保存分类"),
        message: result.warning ?? nextName,
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未写入"),
        message: failureMessage(error),
      });
    }
  }

  const titles: Record<CategoryMode, string> = {
    "create-group": t("新建一级分类"),
    "create-sub": t`在 ${group?.name ?? ""} 中新建子分类`,
    "rename-group": t("重命名一级分类"),
    "rename-sub": t("重命名子分类"),
  };

  return (
    <Form
      navigationTitle={titles[mode]}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("保存")}
            icon={Icon.Checkmark}
            onSubmit={save}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("名称")}
        value={name}
        onChange={setName}
        autoFocus
      />
      <Form.Description
        title={t("说明")}
        text={t("分类改动与书签移动在同一事务写入；默认分类与回收站不可删除。")}
      />
    </Form>
  );
}
