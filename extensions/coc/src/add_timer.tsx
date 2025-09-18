import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { Account, getAccounts, saveAccounts } from "./storage";

interface Props {
  account: Account;
  setAccounts: (accounts: Account[]) => void;
}

export default function AddTimerForm({ account, setAccounts }: Props) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    if (!values.name) return;
    const current = await getAccounts();
    const updated = current.map((a) =>
      a.name === account.name ? { ...a, timers: [...a.timers, { name: values.name }] } : a,
    );
    await saveAccounts(updated);
    setAccounts(updated);
    pop();
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="Timer Name" placeholder="Enter timer name" />
    </Form>
  );
}
