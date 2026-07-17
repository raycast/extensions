import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import type { FormValues, AIPreferences } from "../types";

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
  const preferences = getPreferenceValues<AIPreferences>();
  const availableModels = useMemo(() => {
    if (!preferences.AI_MODEL) {
      return ["openai/gpt-oss-120b"];
    }
    return preferences.AI_MODEL.split(",")
      .map((model) => model.trim())
      .filter(Boolean);
  }, [preferences.AI_MODEL]);

  const isSingleModel = availableModels.length === 1;
  const modelToDisplay = defaultModel || availableModels[0];

  return (
    <Form
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
      {isSingleModel ? (
        <Form.Description title="Model" text={modelToDisplay} />
      ) : (
        <Form.Dropdown id="model" title="Model" defaultValue={modelToDisplay} storeValue={true}>
          {availableModels.map((model) => (
            <Form.Dropdown.Item key={model} value={model} title={model} />
          ))}
        </Form.Dropdown>
      )}
      <Form.Description text="Get the available models at: https://vercel.com/ai-gateway/models and add them to your preferences." />
      {additionalDescription && (
        <Form.Description title={additionalDescription.title} text={additionalDescription.text} />
      )}
    </Form>
  );
}
