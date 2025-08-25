import { Action, ActionPanel, Form, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { useChatGptSearchForm } from "./useChatGptSearchForm";

export default function Command(props: LaunchProps<{ arguments: Arguments.ChatgptSearch }>) {
  const { itemProps, handleSubmit } = useChatGptSearchForm();
  const [isOpenExecuted, setIsOpenExecuted] = useState(false);

  if (props.arguments.query && !isOpenExecuted) {
    handleSubmit({ query: props.arguments.query });
    setIsOpenExecuted(true);
    return null;
  }

  return (
    <Form
      enableDrafts
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Search with ChatGPT..." {...itemProps.query} />
    </Form>
  );
}
