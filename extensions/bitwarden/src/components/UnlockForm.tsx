import { Action, ActionPanel, Form, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { useRef, useState } from "react";
import { useBitwarden } from "~/context/bitwarden";
import { Preferences } from "~/types/preferences";
import { captureException } from "~/utils/development";
import useVaultMessages from "~/utils/hooks/useVaultMessages";
import { getLabelForTimeoutPreference } from "~/utils/preferences";

export type UnlockFormProps = {
  onUnlock: (password: string) => Promise<void>;
  lockReason?: string;
};

/** Form for unlocking or logging in to the Bitwarden vault. */
const UnlockForm = (props: UnlockFormProps) => {
  const { onUnlock, lockReason: lockReasonProp } = props;

  const bitwarden = useBitwarden();
  const [isLoading, setLoading] = useState(false);
  const { userMessage, serverMessage, shouldShowServer } = useVaultMessages();
  const lockReason = useRef(lockReasonProp ?? bitwarden.lockReason).current;

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
            <Action.SubmitForm
              title="Unlock"
              onSubmit={onSubmit}
              icon={Icon.LockUnlocked}
              shortcut={{ key: "enter", modifiers: [] }}
            />
          )}
        </ActionPanel>
      }
    >
      {shouldShowServer && <Form.Description title="Server URL" text={serverMessage} />}
      <Form.Description title="Vault Status" text={userMessage} />
      <Form.PasswordField autoFocus id="password" title="Master Password" />
      {!!lockReason && (
        <>
          <Form.Description title="ℹ️" text={lockReason} />
          <TimeoutInfoDescription />
        </>
      )}
    </Form>
  );
};

function TimeoutInfoDescription() {
  const vaultTimeoutMs = getPreferenceValues<Preferences>().repromptIgnoreDuration;
  const timeoutLabel = getLabelForTimeoutPreference(vaultTimeoutMs);

  if (!timeoutLabel) return null;
  return (
    <Form.Description
      title=""
      text={`Timeout is set to ${timeoutLabel}, this can be configured in the extension settings`}
    />
  );
}

export default UnlockForm;
