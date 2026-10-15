import { useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { t } from "../i18n.ts";
import { failureMessage } from "../bookmark-form.tsx";
import { applyJsonImport } from "../import-export.ts";
import type { ImportDecisions, ImportPlan } from "../import-export.ts";
import { entityKey } from "../model.ts";
import type { Bookmark, Catalog, LibraryState } from "../model.ts";
import { isCatalog } from "./value-labels.ts";
import { ImportDifference } from "./import-difference.tsx";

export function ImportPreview({
  root,
  plan,
  onSaved,
}: {
  root: string;
  plan: ImportPlan;
  onSaved: (state: LibraryState) => void;
}) {
  const { pop } = useNavigation();
  const applying = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [decisions, setDecisions] = useState<ImportDecisions>({});
  const remaining = plan.differences.filter(
    (difference) => !decisions[difference.entityKey],
  ).length;
  const effective = plan.mutations.filter(
    (mutation) =>
      decisions[entityKey(mutation.entity, mutation.entityId)] !== "local",
  );

  async function apply() {
    if (applying.current) return;
    if (remaining) {
      await showToast({
        style: Toast.Style.Failure,
        title: t`还有 ${remaining} 个同 ID 差异未选择`,
      });
      return;
    }
    if (!effective.length) {
      await showToast({
        style: Toast.Style.Success,
        title: t("无变化"),
        message: t("导入内容与本地一致，未写入事件"),
      });
      pop();
      return;
    }
    applying.current = true;
    setIsLoading(true);
    try {
      const result = await applyJsonImport(root, plan, decisions);
      onSaved(result.state);
      await showToast({
        style: result.sharedSyncPaused
          ? Toast.Style.Failure
          : Toast.Style.Success,
        title: result.sharedSyncPaused
          ? t("本地已保存，同步暂停")
          : t("导入已写入本地"),
        message: result.warning ?? t`提交 ${effective.length} 个实体`,
      });
      // Leave the preview, file form, and Settings & Data to reveal the updated grid.
      pop();
      pop();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未写入"),
        message: failureMessage(error),
      });
    } finally {
      applying.current = false;
      setIsLoading(false);
    }
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={t("导入预览")}
      actions={
        <ActionPanel>
          <Action
            title={t("应用导入")}
            icon={Icon.Checkmark}
            onAction={apply}
          />
          <Action title={t("取消")} icon={Icon.XmarkCircle} onAction={pop} />
        </ActionPanel>
      }
    >
      <List.Section title={t("统计")}>
        <List.Item
          title={t`书签 ${plan.counts.bookmarks} · 一级分类 ${plan.counts.groups}`}
          subtitle={t`生成 ID ${plan.counts.generatedIds} · 缺失时间 ${plan.counts.missingTimes} · 与本地完全相同 ${plan.counts.identical}`}
        />
        <List.Item
          title={t`附件/图标字段 ${plan.counts.attachments}`}
          subtitle={t("预览只读；确认后将图片保存到本地 icons，不等待网络")}
          icon={plan.counts.attachments ? Icon.Warning : Icon.Document}
        />
        <List.Item
          title={t`不同 ID 同 URL ${plan.counts.sameUrl}`}
          subtitle={t("只提示，不会自动合并或删除多归属")}
          icon={plan.counts.sameUrl ? Icon.Info : Icon.Document}
        />
      </List.Section>
      {plan.warnings.length > 0 && (
        <List.Section title={t("警告")}>
          {plan.warnings.map((warning) => (
            <List.Item key={warning} title={warning} icon={Icon.Warning} />
          ))}
        </List.Section>
      )}
      {plan.differences.length > 0 && (
        <List.Section
          title={t`同 ID 差异（${plan.differences.length}）`}
          subtitle={t("必须逐项选择，不能静默覆盖")}
        >
          {plan.differences.map((difference) => (
            <List.Item
              key={difference.entityKey}
              title={difference.entityKey}
              subtitle={
                isCatalog(difference.local)
                  ? t`本地 ${(difference.local as Catalog).groups.length} 个一级分类 → 导入后 ${(difference.incoming as Catalog).groups.length} 个`
                  : t`本地「${(difference.local as Bookmark).title}」/ 导入「${(difference.incoming as Bookmark).title}」`
              }
              accessories={[
                { tag: decisions[difference.entityKey] ?? t("未选择") },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title={t("查看完整差异并选择")}
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
      <List.Section title={t("应用")}>
        <List.Item
          title={t("应用导入")}
          subtitle={t`待提交实体 ${effective.length} · 未选择差异 ${remaining}`}
          icon={Icon.Checkmark}
          actions={
            <ActionPanel>
              <Action
                title={t("应用导入")}
                icon={Icon.Checkmark}
                onAction={apply}
              />
              <Action
                title={t("取消")}
                icon={Icon.XmarkCircle}
                onAction={pop}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
