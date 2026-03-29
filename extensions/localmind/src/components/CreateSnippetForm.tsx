import { Form, Action, ActionPanel, useNavigation } from "@raycast/api";

export function CreateSnippetForm(props: { defaultTitle?: string; onCreate: (code: string, content: string) => void }) {
  const { onCreate, defaultTitle = "" } = props;
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create Snippet"
            onSubmit={(values: { code: string; content: string }) => {
              onCreate(values.code, values.content);
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="code" defaultValue={defaultTitle} title="Title" placeholder="e.g. py, js, rust" />
      <Form.TextArea id="content" title="Snippet Content" placeholder="The text to inject when using #title" />
    </Form>
  );
}
