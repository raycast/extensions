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

  const handleUnlockError = (error: unknown, password: string) => {
    const value = treatError(error, { omitSensitiveValue: password });
    if (value) setUnlockError(value);
  };

  async function onSubmit({ password }: { password: string }) {
    if (password.length == 0) {
      showToast(Toast.Style.Failure, "Failed to unlock vault", "Missing password");
      return;
    }
    const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait");
    try {
      setLoading(true);
      setUnlockError(undefined);
      const state = await bitwarden.status();
      if (state.status == "unauthenticated") {
        try {
          await bitwarden.login();
        } catch (error) {
          await showToast(
            Toast.Style.Failure,
            "Failed to unlock vault",
            `Please check your ${shouldShowServer ? "Server URL, " : ""}API Key and Secret.`
          );
          handleUnlockError(error, password);
          return;
        }
      }
      const sessionToken = await bitwarden.unlock(password);
      const passwordHash = await hashMasterPasswordForReprompting(password);

      onUnlock(sessionToken, passwordHash);
      await toast.hide();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to unlock vault", "Please check your credentials");
      handleUnlockError(error, password);
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

export default UnlockForm;
