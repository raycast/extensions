import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { Session } from "../api/session";
import useVaultMessages from "../utils/hooks/useVaultMessages";
import { hashMasterPasswordForReprompting } from "../utils/passwords";

/**
 * Form for unlocking or logging in to the Bitwarden vault.
 */
function UnlockForm(props: { onUnlock: (token: string, hash: string) => void; session: Session }): JSX.Element {
  const { session, onUnlock } = props;
  const { api } = session;
  const [isLoading, setLoading] = useState<boolean>(false);
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages(api);

  async function onSubmit(values: { password: string }) {
    if (values.password.length == 0) {
      showToast(Toast.Style.Failure, "Failed to unlock vault.", "Missing password.");
      return;
    }
    try {
      setLoading(true);
      const toast = await showToast(Toast.Style.Animated, "Unlocking Vault...", "Please wait.");
      const state = await api.status();
      if (state.status == "unauthenticated") {
        try {
          await api.login();
        } catch (error) {
          showToast(
            Toast.Style.Failure,
            "Failed to unlock vault.",
            `Please check your ${shouldShowServer ? "Server URL, " : ""}API Key and Secret.`
          );
          return;
        }
      }
      const sessionToken = await api.unlock(values.password);
      const passwordHash = await hashMasterPasswordForReprompting(values.password);

      toast.hide();
      onUnlock(sessionToken, passwordHash);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed to unlock vault.", "Invalid credentials.");
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
      <Form.PasswordField autoFocus id="password" title="Master Password" />
    </Form>
  );
}

export default UnlockForm;
