import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { Account } from "../types";
import { useAccounts } from "../hooks/useAccounts";

interface FormValues {
  title: string;
}

export default function EditForm(props: { account: Account }) {
  const { account } = props;
  const { updateAccount } = useAccounts();
  const navigation = useNavigation();

  async function onSubmit(values: FormValues) {
    const newTitle = values.title.trim();

    const newAccount = {
      ...account,
      title: newTitle,
    };

    updateAccount(account.id, newAccount);
    navigation.pop();
    showToast(Toast.Style.Success, `Account Saved`);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Account" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="Enter account title" defaultValue={account.title} />
    </Form>
  );
}
