import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

export function CreateTodoForm(props: { defaultTitle?: string; onCreate: (title: string) => void }) {
  const { onCreate, defaultTitle = "" } = props;
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Todo"
            onSubmit={(values: { title: string }) => {
              onCreate(values.title);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" defaultValue={defaultTitle} title="Title" />
    </Form>
  );
}
