import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { createModelProvider } from "../model-provider";
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
  const fallbackModel = defaultModel || preferences.MUSE_MODEL || "muse-spark-1.3";

  const { data: modelIds, isLoading } = useCachedPromise(
    async (apiKey: string) => {
      const models = await createModelProvider({ apiKey }).getModels();
      return models.map((model) => model.id);
    },
    [preferences.MODEL_API_KEY],
  );

  const availableModels = modelIds?.length ? modelIds : [fallbackModel];
  const modelToDisplay = availableModels.includes(fallbackModel) ? fallbackModel : availableModels[0];

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
          <Form.Dropdown.Item key={model} value={model} title={model} />
        ))}
      </Form.Dropdown>
      {additionalDescription && (
        <Form.Description title={additionalDescription.title} text={additionalDescription.text} />
      )}
    </Form>
  );
}
