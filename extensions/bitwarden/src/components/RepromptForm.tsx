import { Action, ActionPanel, Form } from "@raycast/api";

export type RepromptFormProps = {
  description: string;
  onConfirm: (password: string) => void;
};

const RepromptForm = (props: RepromptFormProps) => {
  const { description, onConfirm } = props;

  async function onSubmit(values: { password: string }) {
    onConfirm(values.password);
  }

  return (
    <Form
      navigationTitle="Confirmation Required"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Confirm" onSubmit={onSubmit} shortcut={{ key: "enter", modifiers: [] }} />
        </ActionPanel>
      }
    >
      <Form.Description title="Confirmation Required for" text={description} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
};

export default RepromptForm;
