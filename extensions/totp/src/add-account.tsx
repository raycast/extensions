import { Action, ActionPanel, Form, Icon, popToRoot, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { parseInput, type ParsedAccount } from "./totp";

type Props = {
  onAdd: (account: ParsedAccount) => Promise<void>;
  initialSecret?: string;
  initialName?: string;
  initialIssuer?: string;
  title?: string;
};

export function AddAccountForm({ onAdd, initialSecret = "", initialName = "", initialIssuer = "", title = "Add TOTP Account" }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [secret, setSecret] = useState(initialSecret);
  const [showSecret, setShowSecret] = useState(false);

  async function submit(values: { secret: string; name: string; issuer: string }) {
    setIsLoading(true);
    try {
      await onAdd(parseInput(values.secret, values.name, values.issuer));
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
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Account" icon={Icon.Plus} onSubmit={submit} />
          <Action title={showSecret ? "Hide Secret" : "Show Secret"} icon={showSecret ? Icon.EyeDisabled : Icon.Eye} onAction={() => setShowSecret((visible) => !visible)} />
        </ActionPanel>
      }
    >
      {showSecret ? (
        <Form.TextField
          id="secret"
          title="Secret or URI"
          placeholder="Base32 secret or otpauth://totp/..."
          value={secret}
          onChange={setSecret}
          autoFocus
        />
      ) : (
        <Form.PasswordField
          id="secret"
          title="Secret or URI"
          placeholder="Base32 secret or otpauth://totp/..."
          value={secret}
          onChange={setSecret}
          autoFocus
        />
      )}
      <Form.TextField id="name" title="Name" placeholder="Required for a Base32 secret" defaultValue={initialName} />
      <Form.TextField id="issuer" title="Issuer" placeholder="e.g. GitHub, Google, Figma" defaultValue={initialIssuer} />
    </Form>
  );
}
