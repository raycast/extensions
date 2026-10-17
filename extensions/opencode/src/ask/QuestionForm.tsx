import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getModels } from "../models";
import type { FormValues } from "./types";

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
  const { data: models, isLoading } = useCachedPromise(async () =>
    (await getModels()).map(({ id, title }) => ({ id, title })),
  );

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
      {/* New conversations remember the last model picked; follow-ups keep the conversation's model. */}
      <Form.Dropdown id="model" title="Model" defaultValue={defaultModel} storeValue={!defaultModel}>
        {(models ?? []).map((model) => (
          <Form.Dropdown.Item key={model.id} value={model.id} title={model.title} />
        ))}
      </Form.Dropdown>
      {additionalDescription && (
        <Form.Description title={additionalDescription.title} text={additionalDescription.text} />
      )}
    </Form>
  );
}
