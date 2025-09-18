import { Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import { Account, Timer, getAccounts, saveAccounts } from "./storage";

interface Props {
  setAccounts: (accounts: Account[]) => void;
}

export default function AddAccountForm({ setAccounts }: Props) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    if (!values.name) return;
    const defaults: Timer[] = [
      { name: "Home Builder 1" },
      { name: "Forge" },
      { name: "Builder Builder 1" },
      { name: "Home Research" },
      { name: "Builder Research" },
      { name: "Home Bonus" },
      { name: "Builder Bonus" },
    ];
    const newAccount: Account = { name: values.name, timers: defaults };
    const current = await getAccounts();
    const updated = [...current, newAccount];
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
      <Form.TextField id="name" title="Account Name" placeholder="Enter account name" />
    </Form>
  );
}
