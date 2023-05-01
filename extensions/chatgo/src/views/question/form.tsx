import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { QuestionFormProps } from "../../type";
import { useState } from "react";

export const QuestionForm = ({ initialQuestion, onSubmit }: QuestionFormProps) => {
  const { pop } = useNavigation();
  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [error, setError] = useState<{ question: string }>({
    question: "",
  });
  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Submit"
            icon={Icon.Checkmark}
            onAction={() => {
              onSubmit(question);
              pop();
            }}
          ></Action>
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="question"
        title="Question"
        placeholder="Type your question here"
        error={error.question.length > 0 ? error.question : undefined}
        onChange={setQuestion}
        value={question}
        onBlur={(event) => {
          if (event.target.value?.length == 0) {
            setError({ ...error, question: "Required" });
          } else {
            if (error.question && error.question.length > 0) {
              setError({ ...error, question: "" });
            }
          }
        }}
      ></Form.TextArea>
    </Form>
  );
};
