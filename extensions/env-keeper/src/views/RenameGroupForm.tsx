import { Action, ActionPanel, Alert, confirmAlert, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";

interface RenameGroupFormProps {
  group: string;
  /** 组里有几份方案,提示里讲清楚会波及谁 */
  count: number;
  /** 本项目其它分组名,新名字撞上时视为合并,先确认 */
  otherGroups: string[];
  onRename: (to: string) => Promise<void>;
}

/** 给一个分组改名。分组没有独立实体,改名 = 把组里每份方案的 group 字段一起改掉 */
export function RenameGroupForm({ group, count, otherGroups, onRename }: RenameGroupFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(group);
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const to = name.trim();
    if (!to) {
      setNameError(t("ps.nameEmptyError"));
      return;
    }
    if (to === group) {
      pop();
      return;
    }
    if (otherGroups.includes(to)) {
      const confirmed = await confirmAlert({
        title: t("grp.mergeTitle", { to }),
        message: t("grp.mergeMessage", { from: group, to, count }),
        primaryAction: { title: t("grp.mergeConfirm"), style: Alert.ActionStyle.Default },
        dismissAction: { title: t("common.cancel") },
      });
      if (!confirmed) return;
    }
    try {
      await onRename(to);
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  return (
    <Form
      navigationTitle={t("grp.renameNav", { group })}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("grp.renameSubmit")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("grp.renameNameTitle")}
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
        info={t("grp.renameHint", { group, count })}
      />
    </Form>
  );
}
