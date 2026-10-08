import { Action, ActionPanel, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { contentText } from "../utils/content-text";

interface UpdateUsageFormProps {
  currentUsage: number;
  onSave: (usage: number) => Promise<void>;
}

interface FormValues {
  usage: string;
}

export function UpdateUsageForm({ currentUsage, onSave }: UpdateUsageFormProps) {
  const { pop } = useNavigation();

  async function handleSubmit(values: FormValues) {
    const parsed = parseInt(values.usage, 10);

    if (isNaN(parsed) || parsed < 0 || parsed > 100) {
      await showToast({
        style: Toast.Style.Failure,
        title: contentText.validationInvalidUsage,
        message: contentText.validationInvalidUsageMsg,
      });
      return;
    }

    await onSave(parsed);
    pop();
  }

  return (
    <Form
      navigationTitle={contentText.formTitleUpdateUsage}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={contentText.formSubmitButton} icon={Icon.CheckCircle} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="usage"
        title={contentText.formUsageLabel}
        placeholder={contentText.formUsagePlaceholder}
        defaultValue={String(currentUsage)}
        info={contentText.formUsageInfo}
      />
    </Form>
  );
}
