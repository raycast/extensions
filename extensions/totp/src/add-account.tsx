import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { parseInput, type ParsedAccount } from "./totp";

type Props = { onAdd: (account: ParsedAccount) => Promise<void>; initialSecret?: string };

export function AddAccountForm({ onAdd, initialSecret = "" }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: { secret: string; name: string }) {
    setIsLoading(true);
    try {
      await onAdd(parseInput(values.secret, values.name));
      await showToast({ style: Toast.Style.Success, title: "Account added" });
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not add account", message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      navigationTitle="Add TOTP Account"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Account" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.PasswordField
        id="secret"
        title="Secret or URI"
        placeholder="Base32 secret or otpauth://totp/..."
        defaultValue={initialSecret}
        autoFocus
      />
      <Form.TextField id="name" title="Name" placeholder="Required for a Base32 secret" />
    </Form>
  );
}
