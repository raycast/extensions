import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

export function RenameChatForm(props: { title: string; onSave: (title: string) => Promise<boolean> }) {
  const { pop } = useNavigation();

  async function submit(values: { title: string }) {
    if (await props.onSave(values.title)) pop();
  }

  return (
    <Form
      navigationTitle="Rename Chat"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Rename Chat" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" defaultValue={props.title} />
    </Form>
  );
}
