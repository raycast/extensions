import { Action, ActionPanel, Clipboard, Form, Icon, Toast, confirmAlert, popToRoot, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { FieldInput } from "./FieldInput";
import { MissingCredentialsForm, useCredentialsGuard } from "./MissingCredentials";
import { FIELDS_BY_KIND, KIND_LABEL, isDeferredValue, normalizeStoredValue } from "../lib/fields";
import { createEntity, listResource, previewCreateCommand, serializeFormValue } from "../lib/cli";
import { getTemplatesByKind } from "../lib/storage";
import { FieldDef, MetaRecord, TemplateKind } from "../lib/types";

interface Props {
  kind: TemplateKind;
  initialValues?: Record<string, string>;
}

function isResourceField(kind: TemplateKind, field: FieldDef): boolean {
  return Boolean(field.positional) || (kind === "ad" && field.id === "creative_id");
}

function ResourceDropdown({
  id,
  title,
  records,
  isLoading,
  placeholder,
  defaultValue,
}: {
  id: string;
  title: string;
  records: MetaRecord[];
  isLoading?: boolean;
  placeholder: string;
  defaultValue?: string;
}) {
  const [mode, setMode] = useState<string>();
  const defaultMissingFromList = Boolean(defaultValue && records.every((record) => record.id !== defaultValue));
  const resolvedMode = mode ?? (defaultMissingFromList || records.length === 0 ? "manual" : "list");

  return (
    <>
      <Form.Dropdown
        id={`${id}_mode`}
        title={`${title} 선택`}
        value={resolvedMode}
        onChange={setMode}
        isLoading={isLoading}
      >
        {records.length > 0 ? <Form.Dropdown.Item value="list" title="목록에서 선택" /> : null}
        <Form.Dropdown.Item value="manual" title="ID 직접 입력" />
      </Form.Dropdown>
      {resolvedMode === "list" && records.length > 0 ? (
        <Form.Dropdown id={id} title={title} defaultValue={defaultValue}>
          {records.map((record) => (
            <Form.Dropdown.Item
              key={record.id}
              value={record.id}
              title={`${record.name || record.id} (${record.id})`}
            />
          ))}
        </Form.Dropdown>
      ) : (
        <Form.TextField id={id} title={`${title} ID`} placeholder={placeholder} defaultValue={defaultValue} />
      )}
    </>
  );
}

export function CreateWithTemplate({ kind, initialValues }: Props) {
  const { isReady, isLoading: credsLoading } = useCredentialsGuard();
  const { data: templates = [], isLoading: templatesLoading } = useCachedPromise(getTemplatesByKind, [kind]);
  const fields = FIELDS_BY_KIND[kind];
  const [templateId, setTemplateId] = useState("");
  const [extraIds, setExtraIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parentQuery = useCachedPromise(
    async (resourceKind: TemplateKind) => {
      if (resourceKind === "adset") return listResource("campaign");
      if (resourceKind === "ad") return listResource("adset");
      return [] as MetaRecord[];
    },
    [kind],
    { execute: isReady && (kind === "adset" || kind === "ad") },
  );

  const creativeQuery = useCachedPromise(async () => listResource("creative"), [], {
    execute: isReady && kind === "ad",
  });

  const template = templates.find((item) => item.id === templateId);
  const templateValues = useMemo(
    () => ({ ...(template?.values ?? {}), ...(initialValues ?? {}) }),
    [template, initialValues],
  );

  const remaining = fields.filter((field) => isDeferredValue(templateValues[field.id]));
  const requiredRemaining = remaining.filter((field) => field.required);
  const optionalRemaining = remaining.filter((field) => !field.required);
  const applied = fields.filter((field) => !isDeferredValue(templateValues[field.id]));
  const extraFields = optionalRemaining.filter((field) => extraIds.includes(field.id));
  const visibleFields: FieldDef[] = [...applied, ...requiredRemaining, ...extraFields];
  const appliedInputs = applied.filter((field) => !isResourceField(kind, field));
  const remainingInputs = requiredRemaining.filter((field) => !isResourceField(kind, field));

  async function handleSubmit(formValues: Record<string, unknown>) {
    const merged: Record<string, string> = { ...templateValues };

    for (const field of visibleFields) {
      if (isResourceField(kind, field)) continue;
      const stored = normalizeStoredValue(field, serializeFormValue(formValues[field.id]));
      if (stored) merged[field.id] = stored;
      else delete merged[field.id];
    }

    if (kind === "adset" && formValues.campaign_id) {
      merged.campaign_id = serializeFormValue(formValues.campaign_id);
    }
    if (kind === "ad") {
      if (formValues.adset_id) merged.adset_id = serializeFormValue(formValues.adset_id);
      if (formValues.creative_id) merged.creative_id = serializeFormValue(formValues.creative_id);
    }

    for (const key of Object.keys(merged)) {
      if (isDeferredValue(merged[key])) delete merged[key];
    }

    for (const field of fields.filter((item) => item.required)) {
      if (isDeferredValue(merged[field.id])) {
        await showToast({ style: Toast.Style.Failure, title: `${field.title}이(가) 필요합니다` });
        return;
      }
    }

    const confirmed = await confirmAlert({
      title: `${KIND_LABEL[kind]}를 만들까요?`,
      message: previewCreateCommand(kind, merged),
      primaryAction: { title: "만들기" },
    });
    if (!confirmed) return;

    setIsSubmitting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: `${KIND_LABEL[kind]} 생성 중` });
    try {
      const result = await createEntity(kind, merged);
      toast.style = Toast.Style.Success;
      toast.title = "생성 완료";
      toast.message = result.id ?? result.raw.slice(0, 200);
      if (result.id) {
        await Clipboard.copy(result.id);
        toast.message = `ID ${result.id} (복사됨)`;
      }
      await popToRoot();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "생성 실패";
      toast.message = error instanceof Error ? error.message : String(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (credsLoading) {
    return <Form isLoading />;
  }
  if (!isReady) {
    return <MissingCredentialsForm />;
  }

  const hintText = template
    ? "템플릿 값이 아래에 채워집니다. 생성 전에 수정하거나 비울 수 있습니다."
    : "템플릿을 선택하면 기본값이 채워집니다. 모든 값은 수정할 수 있습니다.";

  return (
    <Form
      isLoading={templatesLoading || parentQuery.isLoading || creativeQuery.isLoading || isSubmitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={`${KIND_LABEL[kind]} 만들기`} icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="template"
        title="템플릿"
        value={templateId}
        onChange={(value) => {
          setTemplateId(value);
          setExtraIds([]);
        }}
      >
        <Form.Dropdown.Item value="" title="템플릿 없이 진행" icon={Icon.Minus} />
        {templates.map((item) => (
          <Form.Dropdown.Item key={item.id} value={item.id} title={item.name} icon={Icon.Document} />
        ))}
      </Form.Dropdown>
      <Form.Description title="안내" text={hintText} />

      {kind === "adset" ? (
        <ResourceDropdown
          id="campaign_id"
          title="캠페인"
          records={parentQuery.data ?? []}
          isLoading={parentQuery.isLoading}
          placeholder="캠페인 ID"
          defaultValue={initialValues?.campaign_id}
        />
      ) : null}

      {kind === "ad" ? (
        <>
          <ResourceDropdown
            id="adset_id"
            title="광고세트"
            records={parentQuery.data ?? []}
            isLoading={parentQuery.isLoading}
            placeholder="광고세트 ID"
            defaultValue={initialValues?.adset_id}
          />
          <ResourceDropdown
            id="creative_id"
            title="크리에이티브"
            records={creativeQuery.data ?? []}
            isLoading={creativeQuery.isLoading}
            placeholder="크리에이티브 ID"
            defaultValue={initialValues?.creative_id}
          />
        </>
      ) : null}

      {appliedInputs.map((field) => (
        <FieldInput key={`${templateId}-${field.id}`} field={field} defaultValue={templateValues[field.id]} />
      ))}

      {remainingInputs.map((field) => (
        <FieldInput key={`${templateId}-${field.id}`} field={field} defaultValue={initialValues?.[field.id]} />
      ))}

      {optionalRemaining.length > 0 ? (
        <Form.TagPicker
          id="extra_options"
          title="추가 옵션"
          value={extraIds}
          onChange={setExtraIds}
          info="템플릿에 없는 옵션 중 이번에 넣을 항목만 고르세요"
        >
          {optionalRemaining.map((field) => (
            <Form.TagPicker.Item key={field.id} value={field.id} title={field.title} icon={Icon.Plus} />
          ))}
        </Form.TagPicker>
      ) : (
        <Form.Description text="템플릿이 선택 가능한 옵션을 모두 포함하고 있습니다." />
      )}

      {extraFields.map((field) => (
        <FieldInput key={`${templateId}-extra-${field.id}`} field={field} />
      ))}
    </Form>
  );
}
