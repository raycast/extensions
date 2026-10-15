import { Fragment } from "react";
import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { t } from "../i18n.ts";
import type { ImportPlan } from "../import-export.ts";

export function ImportDifference({
  difference,
  onChoose,
}: {
  difference: ImportPlan["differences"][number];
  onChoose: (choice: "local" | "incoming") => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={t`导入差异：${difference.entityKey}`}
      actions={
        <ActionPanel>
          <Action
            title={t("保留本地版本")}
            onAction={() => {
              onChoose("local");
              pop();
            }}
          />
          <Action
            title={t("采用导入版本")}
            onAction={() => {
              onChoose("incoming");
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title={t("说明")}
        text={t(
          "逐字段比较本地与导入值（含网址、删除状态、位置、描述、标签与完整分类结构）。选择后还需回到预览应用；现有访问统计不被导入值覆盖。",
        )}
      />
      {[
        ...new Set([
          ...Object.keys(difference.local),
          ...Object.keys(difference.incoming),
        ]),
      ].map((field) => {
        const local =
          JSON.stringify(Reflect.get(difference.local, field), null, 2) ??
          t("（无此字段）");
        const incoming =
          JSON.stringify(Reflect.get(difference.incoming, field), null, 2) ??
          t("（无此字段）");
        return (
          <Fragment key={field}>
            <Form.Separator />
            <Form.Description
              title={`${field}${local === incoming ? t("（相同）") : t("（有差异）")}`}
              text={t`本地：\n${local}\n\n导入：\n${incoming}`}
            />
          </Fragment>
        );
      })}
    </Form>
  );
}
