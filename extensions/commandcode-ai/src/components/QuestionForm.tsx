import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { DEFAULT_MODEL, fetchModels } from "../models";
import type { FormValues } from "../types";

interface QuestionFormProps {
  navigationTitle: string;
  questionTitle: string;
  questionPlaceholder: string;
  defaultQuestion?: string;
  defaultModel?: string;
  onSubmit: (values: FormValues) => Promise<void>;
  onCancel?: () => void;
  additionalDescription?: {
    title: string;
    text: string;
  };
}

export function QuestionForm({
  navigationTitle,
  questionTitle,
  questionPlaceholder,
  defaultQuestion = "",
  defaultModel,
  onSubmit,
  onCancel,
  additionalDescription,
}: QuestionFormProps) {
  const preferences = getPreferenceValues<Preferences>();
  const fallbackModel = defaultModel || preferences.COMMANDCODE_MODEL || DEFAULT_MODEL;

  const { data: listedModels, isLoading } = useCachedPromise(async () => (await fetchModels()).models, []);

  const availableModels = listedModels?.length ? listedModels : [{ id: fallbackModel, name: fallbackModel }];
  const modelToDisplay = availableModels.some((m) => m.id === fallbackModel) ? fallbackModel : availableModels[0].id;

  return (
    <Form
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask Question" icon={Icon.Message} onSubmit={onSubmit} />
          {onCancel && <Action title="Cancel" icon={Icon.XMarkCircle} onAction={onCancel} />}
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title={questionTitle}
        placeholder={questionPlaceholder}
        defaultValue={defaultQuestion}
        autoFocus
      />
      <Form.Dropdown id="model" title="Model" defaultValue={modelToDisplay}>
        {availableModels.map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.name} />
        ))}
      </Form.Dropdown>
      {additionalDescription && (
        <Form.Description title={additionalDescription.title} text={additionalDescription.text} />
      )}
    </Form>
  );
}
