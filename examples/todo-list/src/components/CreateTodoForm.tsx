import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

function CreateTodoForm(props: { defaultTitle?: string; onCreate: (title: string) => void }) {
  const { onCreate, defaultTitle = "" } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { title: string }) => {
      onCreate(values.title);
      pop();
    },
    [onCreate, pop]
  );

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Create Todo" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultTitle} title="Title" />
    </Form>
  );
}

export default CreateTodoForm;
