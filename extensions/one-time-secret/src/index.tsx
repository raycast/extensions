import {
  Form,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  LaunchProps,
  popToRoot,
  closeMainWindow,
} from "@raycast/api";
import { useState } from "react";
import { createClientFromPreferences } from "./create-client";
import { DEFAULT_TTL_SECONDS, MIN_PASSPHRASE_LENGTH, TTL_OPTIONS } from "./constants";

type Values = {
  lifetime: string;
  recipient: string;
  passphrase: string;
  secret: string;
};

export default function Command(props: LaunchProps<{ draftValues: Values }>) {
  const { draftValues } = props;

  const [secretError, setSecretError] = useState<string | undefined>();
  const [passphraseError, setPassphraseError] = useState<string | undefined>();

  function dropSecretErrorIfNeeded() {
    if (secretError && secretError.length > 0) {
      setSecretError(undefined);
    }
  }

  function dropPassphraseErrorIfNeeded() {
    if (passphraseError && passphraseError.length > 0) {
      setPassphraseError(undefined);
    }
  }

  async function handleSubmit(values: Values) {
    const trimmedPass = values.passphrase?.trim() ?? "";
    if (trimmedPass.length > 0 && trimmedPass.length < MIN_PASSPHRASE_LENGTH) {
      setPassphraseError(`Passphrase must be at least ${MIN_PASSPHRASE_LENGTH} characters (API requirement).`);
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Storing secret",
    });

    try {
      const client = createClientFromPreferences();
      const ttl = Number.parseInt(values.lifetime, 10);
      const response = await client.concealSecret(
        values.secret,
        Number.isNaN(ttl) ? DEFAULT_TTL_SECONDS : ttl,
        trimmedPass.length > 0 ? trimmedPass : null,
      );

      await Clipboard.copy(client.getShareableUrl(response.secretIdentifier));

      toast.style = Toast.Style.Success;
      toast.title = "Shared secret";
      toast.message = "Copied link to clipboard";

      await popToRoot({ clearSearchBar: false });
      await closeMainWindow();
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed sharing secret";
      toast.message = String(error);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      enableDrafts
    >
      <Form.TextArea
        id="secret"
        title="Secret*"
        placeholder="The secret to be sent"
        info="Required"
        defaultValue={draftValues?.secret}
        error={secretError}
        onChange={dropSecretErrorIfNeeded}
        onBlur={(event) => {
          const value = event.target.value;

          if (value?.length === 0) {
            setSecretError("You must provide a secret");
          }
        }}
      />
      <Form.Separator />
      <Form.TextField
        id="passphrase"
        title="Passphrase"
        placeholder="Something top sneaky"
        info={`Optional. Minimum ${MIN_PASSPHRASE_LENGTH} characters if set.`}
        defaultValue={draftValues?.passphrase}
        error={passphraseError}
        onChange={dropPassphraseErrorIfNeeded}
      />
      <Form.Dropdown
        id="lifetime"
        title="Lifetime*"
        info="Required. How long should the secret be available for?"
        defaultValue={String(DEFAULT_TTL_SECONDS)}
        storeValue
      >
        {TTL_OPTIONS.map((o) => (
          <Form.Dropdown.Item key={o.value} value={String(o.value)} title={o.title} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
