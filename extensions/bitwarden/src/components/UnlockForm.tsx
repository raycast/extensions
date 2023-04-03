import { Action, ActionPanel, Clipboard, Form, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { useBitwarden } from "~/context/bitwarden";
import { treatError } from "~/utils/debug";
import useVaultMessages from "~/utils/hooks/useVaultMessages";
import { hashMasterPasswordForReprompting } from "~/utils/passwords";

export type UnlockFormProps = {
  onUnlock: (token: string, passwordHash: string) => void;
};

/** Form for unlocking or logging in to the Bitwarden vault. */
const UnlockForm = (props: UnlockFormProps) => {
  const { onUnlock } = props;
  const bitwarden = useBitwarden();
  const [isLoading, setLoading] = useState(false);
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages();
  const lockReasonRef = useRef(bitwarden.lockReason).current;
  const [unlockError, setUnlockError] = useState<string | undefined>(undefined);

  async function onSubmit({ password }: { password: string }) {
    if (password.length == 0) return;
    const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait");
    try {
      setLoading(true);
      setUnlockError(undefined);

      const state = await bitwarden.status();
      if (state.status == "unauthenticated") {
        try {
          await bitwarden.login();
        } catch (error) {
          const { displayableError, treatedError } = getUsefulError(error, password);
          await showToast(
            Toast.Style.Failure,
            "Failed to log in",
            displayableError ?? `Please check your ${shouldShowServer ? "Server URL, " : ""}API Key and Secret.`
          );
          setUnlockError(treatedError);
          return;
        }
      }

      const sessionToken = await bitwarden.unlock(password);
      const passwordHash = await hashMasterPasswordForReprompting(password);
      onUnlock(sessionToken, passwordHash);
      await toast.hide();
    } catch (error) {
      const { displayableError, treatedError } = getUsefulError(error, password);
      await showToast(
        Toast.Style.Failure,
        "Failed to unlock vault",
        displayableError ?? "Please check your credentials"
      );
      setUnlockError(treatedError);
    } finally {
      setLoading(false);
    }
  }

  const copyUnlockError = async () => {
    if (!unlockError) return;
    await Clipboard.copy(unlockError);
    await showToast(Toast.Style.Success, "Error copied to clipboard");
  };

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action.SubmitForm
              icon={Icon.LockUnlocked}
              title="Unlock"
              onSubmit={onSubmit}
              shortcut={{ key: "enter", modifiers: [] }}
            />
          )}
          {!!unlockError && (
            <Action
              onAction={copyUnlockError}
              title="Copy Last Error"
              icon={Icon.Bug}
              style={Action.Style.Destructive}
            />
          )}
        </ActionPanel>
      }
    >
      {shouldShowServer && <Form.Description title="Server URL" text={serverMessage} />}
      <Form.Description title="Vault Status" text={userMessage} />
      {lockReasonRef && <Form.Description title="Reason" text={lockReasonRef} />}
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
};

function getUsefulError(error: unknown, password: string) {
  const treatedError = treatError(error, { omitSensitiveValue: password });
  let displayableError: string | undefined;
  if (/Invalid master password/i.test(treatedError)) {
    displayableError = "Invalid master password";
  } else if (/Invalid API Key/i.test(treatedError)) {
    displayableError = "Invalid Client ID or Secret";
  }
  return { displayableError, treatedError };
}

export default UnlockForm;
