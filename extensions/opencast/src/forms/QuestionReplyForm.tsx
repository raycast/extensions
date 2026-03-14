import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import { useMemo, useState } from "react";
import type { QuestionRequest } from "@opencode-ai/sdk/v2";

type QuestionReplyFormProps = {
  request: QuestionRequest;
  onSubmit: (answers: Array<Array<string>>) => Promise<void>;
};

export function QuestionReplyForm(props: QuestionReplyFormProps) {
  const { pop } = useNavigation();
  const initialState = useMemo(
    () => Object.fromEntries(props.request.questions.map((question, index) => [String(index), ""])),
    [props.request.questions],
  );
  const [answers, setAnswers] = useState<Record<string, string>>(initialState);

  return (
    <Form
      navigationTitle="Reply to Question"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Answers"
            onSubmit={async () => {
              const payload = props.request.questions.map((_, index) => {
                const value = answers[String(index)]?.trim();
                return value ? [value] : [];
              });
              await props.onSubmit(payload);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      {props.request.questions.map((question, index) => (
        <Form.TextArea
          key={index}
          id={String(index)}
          title={question.header}
          value={answers[String(index)] ?? ""}
          onChange={(value) => setAnswers((current) => ({ ...current, [String(index)]: value }))}
          placeholder={question.question}
          info={question.options.map((option) => `${option.label}: ${option.description}`).join("\n")}
        />
      ))}
    </Form>
  );
}
