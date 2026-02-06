import {
  Action,
  ActionPanel,
  Form,
  Icon,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { useActiveAccount } from "../lib/hooks/useActiveAccount";
import { addStoredAccount } from "../lib/accounts";

interface AccountGuardProps {
  children: (apiKey: string, accountName: string) => React.ReactNode;
}

export function AccountGuard({ children }: AccountGuardProps) {
  const { activeAccount, isLoading, revalidate } = useActiveAccount();

  if (isLoading) {
    return null;
  }

  if (!activeAccount) {
    return <SetupForm onAccountAdded={revalidate} />;
  }

  return <>{children(activeAccount.apiKey, activeAccount.name)}</>;
}

function SetupForm({ onAccountAdded }: { onAccountAdded: () => void }) {
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim() || !apiKey.trim()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please fill in all fields",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Adding account",
        message: "Detecting API permissions...",
      });
      await addStoredAccount(name.trim(), apiKey.trim());
      await showToast({
        style: Toast.Style.Success,
        title: "Account added",
        message: name,
      });
      onAccountAdded();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add account",
        message: String(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isSubmitting}
      navigationTitle="Set Up Mercury Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Account"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="No Mercury accounts configured. Add your first API key to get started." />
      <Form.TextField
        id="name"
        title="Account Name"
        placeholder="e.g., Personal, Business"
        value={name}
        onChange={setName}
      />
      <Form.PasswordField
        id="apiKey"
        title="API Key"
        placeholder="Enter your Mercury API key"
        value={apiKey}
        onChange={setApiKey}
      />
      <Form.Description text="Get your API key from Mercury Dashboard → Settings → API Tokens" />
    </Form>
  );
}