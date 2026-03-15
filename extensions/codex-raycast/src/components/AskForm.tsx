import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";

import { DEFAULT_MODEL, MODEL_OPTIONS } from "../utils/models";
import type { Model } from "../utils/models";
import { AnswerDetail } from "./AnswerDetail";

type AskFormValues = {
  question: string;
  model: Model;
};

export default function AskForm() {
  const { push } = useNavigation();

  async function handleSubmit(values: AskFormValues) {
    const question = values.question.trim();
    const { model } = values;

    if (!question) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Question required",
        message: "Enter a question before submitting.",
      });
      return;
    }

    push(<AnswerDetail question={question} model={model} />);
  }

  return (
    <Form
      navigationTitle="Ask Codex"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Ask" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="model" title="Model" defaultValue={DEFAULT_MODEL}>
        {MODEL_OPTIONS.map((model) => (
          <Form.Dropdown.Item key={model.value} value={model.value} title={model.title} />
        ))}
      </Form.Dropdown>
      <Form.TextArea id="question" title="Question" placeholder="Ask anything" autoFocus />
    </Form>
  );
}
