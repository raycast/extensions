import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useState } from "react";
import { ChatFullFormPropsType } from "../../type/chat";

export const ChatFullForm = ({ initialQuestion, onSubmit }: ChatFullFormPropsType) => {
  const { pop } = useNavigation();

  const [question, setQuestion] = useState<string>(initialQuestion ?? "");
  const [file, setFile] = useState<string[] | undefined>(undefined);
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
              onSubmit(question, file);
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
      <Form.FilePicker
        id="file"
        title="File"
        onChange={setFile}
        value={file}
        allowMultipleSelection={false}
        canChooseDirectories={false}
      />
    </Form>
  );
};
