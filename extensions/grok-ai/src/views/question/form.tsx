import { Action, ActionPanel, Form, Icon } from "@raycast/api";
import { useState } from "react";
import { DEFAULT_MODEL } from "../../hooks/useModel";
import { QuestionFormProps } from "../../type";

export const QuestionForm = ({
  initialQuestion,
  selectedModel,
  models,
  onModelChange,
  onSubmit,
}: QuestionFormProps) => {
  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [questionError, setQuestionError] = useState<string | undefined>();

  const separateDefaultModel = models.filter((x) => x.id !== "grok-3");
  const defaultModel = models.find((x) => x.id === "grok-3") ?? DEFAULT_MODEL;

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask Grok"
            icon={Icon.Checkmark}
            onSubmit={() => {
              if (question.length === 0) {
                setQuestionError("Required");
                return;
              }
              onSubmit(question);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Ask Grok a question..."
        error={questionError}
        onChange={(q) => {
          if (questionError && questionError.length > 0) {
            setQuestionError(undefined);
          }
          setQuestion(q);
        }}
        value={question}
        onBlur={(e) => {
          if (e.target.value && e.target.value.length > 0) {
            setQuestionError(undefined);
          } else {
            setQuestionError("Required");
          }
        }}
      />
      <Form.Dropdown
        id="model"
        title="Model"
        placeholder="Choose Grok model"
        defaultValue={selectedModel}
        onChange={onModelChange}
      >
        {defaultModel && <Form.Dropdown.Item key={defaultModel.id} title={defaultModel.name} value={defaultModel.id} />}
        <Form.Dropdown.Section title="Other Models">
          {separateDefaultModel.map((model) => (
            <Form.Dropdown.Item value={model.id} title={model.name} key={model.id} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
    </Form>
  );
};
