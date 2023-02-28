import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useSession } from "~/context/session";

export type RepromptFormProps = {
  description: string;
  onConfirm: () => void;
};

/**
 * Form for confirming the master password.
 * This compares with the hashed master password.
 *
 * @param props.session The session instance.
 * @param props.description A description explaining why reprompting is required.
 * @param props.onConfirm Callback if confirmation is successful.
 */
const RepromptForm = (props: RepromptFormProps) => {
  const { description, onConfirm } = props;
  const session = useSession();

  async function onSubmit(values: { password: string }) {
    if (!(await session.confirmMasterPassword(values.password))) {
      showToast(Toast.Style.Failure, "Confirmation failed.");
      return;
    }

    onConfirm();
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
      <Form.Description text={description} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
};

export default RepromptForm;
