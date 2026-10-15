import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { t } from "../i18n.ts";
import type { Bookmark } from "../model.ts";

export function TemplateForm({
  fields,
  bookmark,
  onSubmit,
}: {
  fields: string[];
  bookmark: Bookmark;
  onSubmit: (values: Record<string, string>) => Promise<boolean>;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={t`打开：${bookmark.title}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("打开")}
            icon={Icon.Globe}
            onSubmit={async (values: Form.Values) => {
              const succeeded = await onSubmit(
                Object.fromEntries(
                  fields.map((field) => [field, String(values[field] ?? "")]),
                ),
              );
              if (succeeded) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description title={t("模板")} text={bookmark.url} />
      {fields.map((field) => (
        <Form.TextField
          key={field}
          id={field}
          title={`{${field}}`}
          placeholder={t("参数值（会做 URL 编码）")}
        />
      ))}
    </Form>
  );
}
