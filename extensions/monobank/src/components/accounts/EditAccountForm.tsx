import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { Account } from "../../types";

interface FormValues {
  title: string;
}

export default function EditAccountForm(props: {
  account: Account;
  onEdit: (id: string, patch: Pick<Account, "title">) => void;
}) {
  const { account, onEdit } = props;
  const navigation = useNavigation();

  async function onSubmit(values: FormValues) {
    onEdit(account.id, { title: values.title.trim() });
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
