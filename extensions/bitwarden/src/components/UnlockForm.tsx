import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { useBitwarden } from "~/context/bitwarden";
import { captureException } from "~/utils/development";
import useVaultMessages from "~/utils/hooks/useVaultMessages";

export type UnlockFormProps = {
  onUnlock: (password: string) => Promise<void>;
};

/** Form for unlocking or logging in to the Bitwarden vault. */
const UnlockForm = (props: UnlockFormProps) => {
  const { onUnlock } = props;
  const bitwarden = useBitwarden();
  const [isLoading, setLoading] = useState(false);
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages();
  const lockReason = useRef(bitwarden.lockReason).current;

  async function onSubmit({ password }: { password: string }) {
    if (password.length == 0) {
      showToast(Toast.Style.Failure, "Failed to unlock vault", "Missing password");
      return;
    }
    try {
      setLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait");
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
          captureException("Failed to unlock vault", error);
          return;
        }
      }
      await onUnlock(password);
      toast.hide();
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to unlock vault", "Check your credentials");
      captureException("Failed to unlock vault", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          {!isLoading && (
            <Action.SubmitForm title="Unlock" onSubmit={onSubmit} shortcut={{ key: "enter", modifiers: [] }} />
          )}
        </ActionPanel>
      }
    >
      {shouldShowServer && <Form.Description title="Server URL" text={serverMessage} />}
      <Form.Description title="Vault Status" text={userMessage} />
      {lockReason && <Form.Description title="Reason" text={lockReason} />}
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
};

export default UnlockForm;
