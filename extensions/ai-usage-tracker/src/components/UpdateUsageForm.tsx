import { Form, ActionPanel, Action, useNavigation, showToast, Toast, Icon } from "@raycast/api";

import type { Translations } from "../i18n/translations";

interface UpdateUsageFormProps {
  currentUsage: number;
  t: Translations;
  onSave: (usage: number) => Promise<void>;
}

interface FormValues {
  usage: string;
}

export function UpdateUsageForm({ currentUsage, t, onSave }: UpdateUsageFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const parsed = parseInt(values.usage, 10);

    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      await showToast({
        style: Toast.Style.Failure,
        title: t.validationInvalidUsage,
        message: t.validationInvalidUsageMsg,
      });
      return;
    }

    await onSave(parsed);
    pop();
  }

  return (
    <Form
      navigationTitle={t.formTitleUpdateUsage}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t.formSubmitButton} icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="usage"
        title={t.formUsageLabel}
        placeholder={t.formUsagePlaceholder}
        defaultValue={String(currentUsage)}
        info={t.formUsageInfo}
      />
    </Form>
  );
}
