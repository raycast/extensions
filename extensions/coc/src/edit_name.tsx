import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { Account, Timer, getAccounts, saveAccounts } from "./storage";

interface Props {
  timer: Timer;
  account: Account;
  setAccounts: (accounts: Account[]) => void;
}

export default function EditNameForm({ timer, account, setAccounts }: Props) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    if (!values.name) return;
    const current = await getAccounts();
    const updated = current.map((a) =>
      a.name === account.name
        ? { ...a, timers: a.timers.map((t) => (t.name === timer.name ? { ...t, name: values.name } : t)) }
        : a,
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
      <Form.TextField id="name" title="New Name" defaultValue={timer.name} />
    </Form>
  );
}
