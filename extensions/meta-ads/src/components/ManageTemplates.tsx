import { Action, ActionPanel, Alert, Color, Icon, List, confirmAlert, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { TemplateForm } from "./TemplateForm";
import { KIND_LABEL, formatFieldValue, FIELDS_BY_KIND } from "../lib/fields";
import { deleteTemplate, getTemplates } from "../lib/storage";
import { Template, TemplateKind } from "../lib/types";

const KINDS: TemplateKind[] = ["campaign", "adset", "ad"];

export default function ManageTemplates() {
  const { data: templates = [], isLoading, revalidate } = useCachedPromise(getTemplates);

  async function handleDelete(template: Template) {
    const confirmed = await confirmAlert({
      title: "템플릿을 삭제할까요?",
      message: template.name,
      primaryAction: { title: "삭제", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    await deleteTemplate(template.id);
    await showToast({ style: Toast.Style.Success, title: "삭제했습니다" });
    revalidate();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="템플릿 검색">
      {KINDS.map((kind) => {
        const items = templates.filter((template) => template.kind === kind);
        return (
          <List.Section key={kind} title={KIND_LABEL[kind]} subtitle={`${items.length}개`}>
            {items.length === 0 ? (
              <List.Item
                title="템플릿 없음"
                subtitle="항상 넣는 기본값을 템플릿으로 저장하세요"
                icon={Icon.Plus}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title={`${KIND_LABEL[kind]} 템플릿 만들기`}
                      icon={Icon.Plus}
                      target={<TemplateForm kind={kind} onSaved={revalidate} />}
                    />
                  </ActionPanel>
                }
              />
            ) : (
              items.map((template) => {
                const fields = FIELDS_BY_KIND[kind];
                const summary = Object.entries(template.values)
                  .map(([id, value]) => {
                    const field = fields.find((item) => item.id === id);
                    return field ? `${field.title}: ${formatFieldValue(field, value)}` : `${id}: ${value}`;
                  })
                  .join(" · ");
                return (
                  <List.Item
                    key={template.id}
                    title={template.name}
                    subtitle={summary}
                    icon={Icon.Document}
                    accessories={[
                      { tag: { value: `${Object.keys(template.values).length}개 필드`, color: Color.Blue } },
                    ]}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="수정"
                          icon={Icon.Pencil}
                          target={<TemplateForm kind={kind} template={template} onSaved={revalidate} />}
                        />
                        <Action.Push
                          title={`${KIND_LABEL[kind]} 템플릿 만들기`}
                          icon={Icon.Plus}
                          target={<TemplateForm kind={kind} onSaved={revalidate} />}
                        />
                        <Action
                          title="삭제"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() => handleDelete(template)}
                        />
                      </ActionPanel>
                    }
                  />
                );
              })
            )}
          </List.Section>
        );
      })}
    </List>
  );
}
