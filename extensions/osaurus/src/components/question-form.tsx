import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import type { Model } from "../lib/osaurus";

export interface QuestionFormProps {
  title: string;
  initialQuestion: string;
  models: Model[];
  selectedModel: string;
  onModelChange: (id: string) => void;
  onSubmit: (question: string, modelId: string) => void;
}

// Full-text input for long prompts and follow-ups. The form holds its own model selection and
// submits that id: a pushed form's closure can't see later changes to the parent's state.
export function QuestionForm({
  title,
  initialQuestion,
  models,
  selectedModel,
  onModelChange,
  onSubmit,
}: QuestionFormProps) {
  const { pop } = useNavigation();
  const [question, setQuestion] = useState(initialQuestion);
  const [modelId, setModelId] = useState(selectedModel);
  const [error, setError] = useState<string>();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action
            title="Ask"
            icon={Icon.ArrowRight}
            onAction={() => {
              if (!question.trim()) return setError("Enter a question");
              onSubmit(question.trim(), modelId);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Ask anything…"
        value={question}
        error={error}
        onChange={(value) => {
          setQuestion(value);
          if (error && value.trim()) setError(undefined);
        }}
      />
      <Form.Dropdown
        id="model"
        title="Model"
        value={modelId}
        onChange={(id) => {
          setModelId(id);
          onModelChange(id);
        }}
      >
        {models.map((m) => (
          <Form.Dropdown.Item key={m.id} value={m.id} title={m.id} icon={Icon.ComputerChip} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
