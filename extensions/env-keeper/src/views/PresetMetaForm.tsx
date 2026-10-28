import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { Preset } from "@env-keeper/core";
import { t } from "../i18n.js";
import { showFailureToast } from "./failureToast.js";
import { formatEnvContentMasked } from "./diffFormat.js";
import { useGroupFields } from "./GroupFields.js";

export interface PresetMetaData {
  name: string;
  note?: string;
  group?: string;
  /** 只在 editableContent 模式下有值 */
  content?: string;
}

interface PresetMetaFormProps {
  /** 有值 = 编辑已有方案的名字/备注/分组;没有 = 新建 */
  initialData?: Pick<Preset, "name" | "note" | "group">;
  /** 本项目已经用过的分组名,列在下拉框里供选 */
  existingGroups: string[];
  /** 本项目其它方案的名字(编辑时不含自己):同名方案在套用菜单里长得一模一样,不让存 */
  existingNames?: string[];
  /**
   * 新建时提供:要存进去的内容,只读预览且打码。
   * 这一步不给改——改内容的入口在「管理方案」里,那里用户是明确要看明文的
   */
  contentPreview?: { content: string; sourceFile: string; customSecrets?: string[] };
  /**
   * 新建**空白**方案时提供:直接给一个明文编辑框从零写。
   * 跟 contentPreview 互斥——预览打码是因为那里装的是现有密钥,空白新建没这个顾虑
   */
  editableContent?: boolean;
  /** 表单标题;不传就按"新建/编辑"取默认 */
  navTitle?: string;
  onSave: (data: PresetMetaData) => Promise<void>;
}

export function PresetMetaForm({
  initialData,
  existingGroups,
  existingNames = [],
  contentPreview,
  editableContent,
  navTitle,
  onSave,
}: PresetMetaFormProps) {
  const { pop } = useNavigation();
  const [name, setName] = useState(initialData?.name ?? "");
  const [note, setNote] = useState(initialData?.note ?? "");
  const [content, setContent] = useState("");
  const { group, fields: groupFields } = useGroupFields(initialData?.group, existingGroups);
  const [nameError, setNameError] = useState<string | undefined>();

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError(t("ps.nameEmptyError"));
      return;
    }
    if (existingNames.includes(trimmedName)) {
      setNameError(t("ps.nameDuplicateError"));
      return;
    }
    try {
      await onSave({
        name: trimmedName,
        note: note.trim() || undefined,
        group,
        ...(editableContent ? { content } : {}),
      });
      pop();
    } catch (e) {
      await showFailureToast(t("common.saveFailedTitle"), e);
    }
  };

  const previewText = contentPreview
    ? formatEnvContentMasked(contentPreview.content, contentPreview.customSecrets)
    : undefined;

  return (
    <Form
      navigationTitle={navTitle ?? (initialData ? t("ps.formNavEdit") : t("ps.formNavCreate"))}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={initialData ? t("ps.submitEdit") : t("ps.submitCreate")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title={t("ps.nameTitle")}
        placeholder={t("ps.namePlaceholder")}
        value={name}
        onChange={(v) => {
          setName(v);
          setNameError(undefined);
        }}
        error={nameError}
      />
      <Form.TextField
        id="note"
        title={t("ps.noteTitle")}
        placeholder={t("ps.notePlaceholder")}
        value={note}
        onChange={setNote}
      />
      {groupFields}
      {editableContent && (
        <>
          <Form.Separator />
          <Form.TextArea
            id="content"
            title={t("ps.contentTitle")}
            placeholder={t("ps.blankContentPlaceholder")}
            value={content}
            onChange={setContent}
          />
          <Form.Description text={t("ps.contentHint")} />
        </>
      )}
      {contentPreview && (
        <>
          <Form.Separator />
          <Form.Description
            title={t("ps.contentPreviewTitle")}
            text={previewText?.trim() ? previewText : t("ps.contentPreviewEmpty")}
          />
          <Form.Description text={t("ps.contentPreviewHint", { file: contentPreview.sourceFile })} />
        </>
      )}
    </Form>
  );
}
