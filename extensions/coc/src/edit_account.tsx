import { Form, ActionPanel, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { Account, getAccounts, saveAccounts } from "./storage";

interface Props {
  account: Account;
  setAccounts: (updater: (prev: Account[]) => Account[]) => void;
}

export default function EditAccountForm({ account, setAccounts }: Props) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { name: string }) => {
    if (!values.name) {
      showToast({ style: Toast.Style.Failure, title: "Name is required" });
      return;
    }
    if (values.name === account.name) {
      showToast({ style: Toast.Style.Animated, title: "Name unchanged" });
      pop();
      return;
    }

    try {
      const current = await getAccounts();
      const updatedAccounts = current.map((a) => (a.name === account.name ? { ...a, name: values.name } : a));
      await saveAccounts(updatedAccounts);
      setAccounts((prev) => prev.map((a) => (a.name === account.name ? { ...a, name: values.name } : a)));
      console.log("Renamed account from", account.name, "to", values.name); // Debug log
      showToast({ style: Toast.Style.Success, title: `Renamed to ${values.name}` });
      pop();
    } catch (error) {
      console.error("Error renaming account:", error);
      showToast({ style: Toast.Style.Failure, title: "Failed to rename account" });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Name" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title="New Account Name" defaultValue={account.name} placeholder="Enter new name" />
    </Form>
  );
}
