import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { Prompt, QuestionFormProps } from "../../type";
//
export const QuestionForm = ({
  initialQuestion,
  selectedPrompt,
  prompts,
  onPromptChange,
  onSubmit,
}: QuestionFormProps) => {
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
          />
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
      />
      <Form.Dropdown
        id="prompt"
        title="Prompt"
        placeholder="Choose prompt"
        defaultValue={selectedPrompt.id}
        onChange={(selectedPromptId) => {
          let selectedPrompt = prompts.find((prompt) => prompt.id == selectedPromptId);
          if (!!selectedPrompt) {
            onPromptChange(selectedPrompt as Prompt);
          }
        }}
      >
        {prompts.map((prompt) => (
          <Form.Dropdown.Item value={prompt.id} title={prompt.name} key={prompt.id} />
        ))}
      </Form.Dropdown>
    </Form>
  );
};
