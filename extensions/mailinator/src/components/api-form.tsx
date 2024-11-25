import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

export function ApiForm({ onSubmit }: { onSubmit: (values: { token: string }) => void }) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { token: string }) => {
    await onSubmit(values);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Sign In" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="token" title="API Token" placeholder="Enter your API Token" />
    </Form>
  );
}
