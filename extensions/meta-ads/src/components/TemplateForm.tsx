import { randomUUID } from "node:crypto";
import { Action, ActionPanel, Form, Icon, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { FieldInput } from "./FieldInput";
import { KIND_LABEL, normalizeStoredValue, templateableFields } from "../lib/fields";
import { upsertTemplate } from "../lib/storage";
import { serializeFormValue } from "../lib/cli";
import { Template, TemplateKind } from "../lib/types";

interface Props {
  kind: TemplateKind;
  template?: Template;
  onSaved?: () => void;
}

export function TemplateForm({ kind, template, onSaved }: Props) {
  const { pop } = useNavigation();
  const fields = templateableFields(kind);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formValues: Record<string, unknown>) {
    const name = serializeFormValue(formValues.template_name);
    if (!name) {
      await showToast({ style: Toast.Style.Failure, title: "템플릿 이름을 입력하세요" });
      return;
    }

    const values: Record<string, string> = {};
    for (const field of fields) {
      const stored = normalizeStoredValue(field, serializeFormValue(formValues[field.id]));
      if (!stored) continue;
      values[field.id] = stored;
    }

    setIsSubmitting(true);
    try {
      const now = new Date().toISOString();
      await upsertTemplate({
        id: template?.id ?? randomUUID(),
        name,
        kind,
        values,
        createdAt: template?.createdAt ?? now,
        updatedAt: now,
      });
      await showToast({
        style: Toast.Style.Success,
        title: template ? "템플릿을 수정했습니다" : "템플릿을 저장했습니다",
      });
      onSaved?.();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "저장 실패",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle={template ? `${KIND_LABEL[kind]} 템플릿 수정` : `${KIND_LABEL[kind]} 템플릿 만들기`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="템플릿 저장" icon={Icon.Check} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="template_name"
        title="템플릿 이름"
        placeholder={`예: ${KIND_LABEL[kind]} 전환 기본값`}
        defaultValue={template?.name}
      />
      <Form.Description text="모든 필드가 표시됩니다. 지금 정하지 않을 값은 '나중에 입력'으로 두세요. 생성 화면에서 다시 묻습니다." />
      {fields.map((field) => (
        <FieldInput key={field.id} field={field} defaultValue={template?.values[field.id]} allowDefer />
      ))}
    </Form>
  );
}
