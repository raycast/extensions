import { useCallback } from "react";
import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

function CreateTodoForm(props: { defaultTitle?: string; onCreate: (title: string, password: string) => void }) {
  const { onCreate, defaultTitle = "" } = props;
  const { pop } = useNavigation();

  const handleSubmit = useCallback(
    (values: { title: string; password: string }) => {
      // encrype password here

      onCreate(values.title, values.password);
      pop();
    },
    [onCreate, pop],
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
      <Form.PasswordField id="password" title="New Password" />
    </Form>
  );
}

export default CreateTodoForm;
