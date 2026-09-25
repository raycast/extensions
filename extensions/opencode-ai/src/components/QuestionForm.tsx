import { Action, ActionPanel, Form, Icon, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { createModelProvider } from "../model-provider";
import type { FormValues } from "../types";
import { DEFAULT_MODEL } from "../constants";

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
  const fallbackModel = defaultModel || preferences.OPENCODE_MODEL || DEFAULT_MODEL;

  const { data: models, isLoading } = useCachedPromise(
    async (apiKey: string, includeZen: boolean, includeGo: boolean) => {
      const registered = await createModelProvider({ apiKey, includeZen, includeGo }).getModels();
      return registered.map(({ id, title }) => ({ id, title }));
    },
    [preferences.OPENCODE_API_KEY, preferences.OPENCODE_ZEN, preferences.OPENCODE_GO],
  );

  const availableModels = models?.length ? models : [{ id: fallbackModel, title: fallbackModel }];
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
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.title} />
        ))}
      </Form.Dropdown>
      {additionalDescription && (
        <Form.Description title={additionalDescription.title} text={additionalDescription.text} />
      )}
    </Form>
  );
}
